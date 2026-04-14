from algopy import ARC4Contract, Account, Asset, Global, LocalState, Txn, UInt64, gtxn, itxn
from algopy.arc4 import abimethod


class AlgoPool(ARC4Contract):

    def __init__(self) -> None:
        self.pool = UInt64(0)
        self.total_shares = UInt64(0)
        self.usdc_asset_id = UInt64(10458941)
        self.daily_interest_bps = UInt64(10)  # 0.1% / day
        self.microalgos_per_algo = UInt64(1_000_000)
        self.min_aura_for_unsecured = UInt64(30)
        self.unsecured_limit_bps_of_aura = UInt64(1000)  # 10%

        self.shares = LocalState(UInt64, key="shares")

        self.loan_active = LocalState(UInt64, key="loan_active")
        self.loan_type = LocalState(UInt64, key="loan_type")  # 1=collateral, 2=unsecured
        self.principal = LocalState(UInt64, key="principal")
        self.interest_due = LocalState(UInt64, key="interest_due")
        self.due_amount = LocalState(UInt64, key="due_amount")
        self.collateral_usdc = LocalState(UInt64, key="collateral_usdc")
        self.due_ts = LocalState(UInt64, key="due_ts")

        self.aura_earned = LocalState(UInt64, key="aura_earned")
        self.aura_penalty = LocalState(UInt64, key="aura_penalty")
        self.aura_blacklisted = LocalState(UInt64, key="aura_blacklisted")

    def _interest_to_aura_points(self, interest_microalgo: UInt64) -> UInt64:
        return interest_microalgo // self.microalgos_per_algo

    def _net_aura(self, borrower: Account) -> UInt64:
        earned = self.aura_earned.get(borrower, UInt64(0))
        penalty = self.aura_penalty.get(borrower, UInt64(0))
        if earned >= penalty:
            return earned - penalty
        return UInt64(0)

    def _max_unsecured_amount_microalgo(self, borrower: Account) -> UInt64:
        net_aura = self._net_aura(borrower)
        return (net_aura * self.unsecured_limit_bps_of_aura * self.microalgos_per_algo) // UInt64(10_000)

    @abimethod(allow_actions=["OptIn"])
    def opt_in(self) -> None:
        self.shares[Txn.sender] = UInt64(0)
        self.loan_active[Txn.sender] = UInt64(0)
        self.loan_type[Txn.sender] = UInt64(0)
        self.principal[Txn.sender] = UInt64(0)
        self.interest_due[Txn.sender] = UInt64(0)
        self.due_amount[Txn.sender] = UInt64(0)
        self.collateral_usdc[Txn.sender] = UInt64(0)
        self.due_ts[Txn.sender] = UInt64(0)
        self.aura_earned[Txn.sender] = UInt64(0)
        self.aura_penalty[Txn.sender] = UInt64(0)
        self.aura_blacklisted[Txn.sender] = UInt64(0)

    @abimethod()
    def app_opt_in_usdc(self) -> None:
        assert Txn.sender == Global.creator_address, "Only admin"
        itxn.AssetTransfer(
            xfer_asset=self.usdc_asset_id,
            asset_receiver=Global.current_application_address,
            asset_amount=UInt64(0),
            fee=UInt64(0),
        ).submit()

    @abimethod()
    def deposit(self, payment_txn_index: UInt64) -> UInt64:
        pay = gtxn.PaymentTransaction(payment_txn_index)
        assert pay.sender == Txn.sender, "Invalid sender"
        assert pay.receiver == Global.current_application_address, "Invalid receiver"
        amount = pay.amount
        assert amount > 0, "Amount must be positive"

        user_shares = self.shares.get(Txn.sender, UInt64(0))

        if self.pool == 0:
            minted = amount
        else:
            minted = (amount * self.total_shares) // self.pool

        self.pool += amount
        self.total_shares += minted
        self.shares[Txn.sender] = user_shares + minted

        return minted

    @abimethod()
    def admin_add_pool_liquidity(self, payment_txn_index: UInt64) -> UInt64:
        assert Txn.sender == Global.creator_address, "Only admin"
        pay = gtxn.PaymentTransaction(payment_txn_index)
        assert pay.sender == Txn.sender, "Invalid sender"
        assert pay.receiver == Global.current_application_address, "Invalid receiver"
        assert pay.amount > 0, "Amount must be positive"

        self.pool += pay.amount
        return self.pool

    @abimethod()
    def withdraw(self, share_amount: UInt64) -> UInt64:
        assert share_amount > 0, "Share amount must be positive"
        user_shares = self.shares.get(Txn.sender, UInt64(0))
        assert user_shares >= share_amount, "Insufficient shares"
        assert self.total_shares > 0, "No shares in pool"

        algo = (share_amount * self.pool) // self.total_shares
        assert algo > 0, "Nothing to withdraw"

        # Update accounting first
        self.pool -= algo
        self.total_shares -= share_amount
        self.shares[Txn.sender] = user_shares - share_amount

        # Payout real ALGO from app account to investor
        itxn.Payment(
            receiver=Txn.sender,
            amount=algo,
            fee=UInt64(0),
        ).submit()

        return algo

    @abimethod()
    def request_collateral_loan(
        self,
        algo_amount: UInt64,
        days_to_repay: UInt64,
        min_collateral_usdc: UInt64,
        collateral_txn_index: UInt64,
    ) -> UInt64:
        assert algo_amount > 0, "Amount must be positive"
        assert days_to_repay > 0, "Days must be positive"
        assert self.loan_active.get(Txn.sender, UInt64(0)) == 0, "Active loan exists"
        assert self.pool >= algo_amount, "Insufficient pool liquidity"

        collateral_txn = gtxn.AssetTransferTransaction(collateral_txn_index)
        assert collateral_txn.sender == Txn.sender, "Invalid collateral sender"
        assert collateral_txn.asset_receiver == Global.current_application_address, "Invalid collateral receiver"
        assert collateral_txn.xfer_asset == Asset(self.usdc_asset_id), "Invalid collateral asset"
        assert collateral_txn.asset_amount >= min_collateral_usdc, "Insufficient collateral"

        per_day_interest = (algo_amount * self.daily_interest_bps) // UInt64(10_000)
        interest = per_day_interest * days_to_repay
        due = algo_amount + interest

        self.loan_active[Txn.sender] = UInt64(1)
        self.loan_type[Txn.sender] = UInt64(1)
        self.principal[Txn.sender] = algo_amount
        self.interest_due[Txn.sender] = interest
        self.due_amount[Txn.sender] = due
        self.collateral_usdc[Txn.sender] = collateral_txn.asset_amount
        self.due_ts[Txn.sender] = Global.latest_timestamp + (days_to_repay * UInt64(86_400))

        self.pool -= algo_amount

        itxn.Payment(
            receiver=Txn.sender,
            amount=algo_amount,
            fee=UInt64(0),
        ).submit()

        return due

    @abimethod()
    def request_unsecured_loan(self, algo_amount: UInt64, days_to_repay: UInt64) -> UInt64:
        assert algo_amount > 0, "Amount must be positive"
        assert days_to_repay > 0, "Days must be positive"
        assert self.loan_active.get(Txn.sender, UInt64(0)) == 0, "Active loan exists"
        assert self.pool >= algo_amount, "Insufficient pool liquidity"
        assert self.aura_blacklisted.get(Txn.sender, UInt64(0)) == 0, "Blacklisted for unsecured loans"
        assert self._net_aura(Txn.sender) >= self.min_aura_for_unsecured, "AURA must be at least 30"
        assert algo_amount <= self._max_unsecured_amount_microalgo(Txn.sender), "Requested amount exceeds credit limit"

        per_day_interest = (algo_amount * self.daily_interest_bps) // UInt64(10_000)
        interest = per_day_interest * days_to_repay
        due = algo_amount + interest

        self.loan_active[Txn.sender] = UInt64(1)
        self.loan_type[Txn.sender] = UInt64(2)
        self.principal[Txn.sender] = algo_amount
        self.interest_due[Txn.sender] = interest
        self.due_amount[Txn.sender] = due
        self.collateral_usdc[Txn.sender] = UInt64(0)
        self.due_ts[Txn.sender] = Global.latest_timestamp + (days_to_repay * UInt64(86_400))

        self.pool -= algo_amount

        itxn.Payment(
            receiver=Txn.sender,
            amount=algo_amount,
            fee=UInt64(0),
        ).submit()

        return due

    @abimethod()
    def repay(self, payment_txn_index: UInt64) -> UInt64:
        assert self.loan_active.get(Txn.sender, UInt64(0)) == 1, "No active loan"

        due = self.due_amount.get(Txn.sender, UInt64(0))
        interest = self.interest_due.get(Txn.sender, UInt64(0))
        collateral = self.collateral_usdc.get(Txn.sender, UInt64(0))

        pay = gtxn.PaymentTransaction(payment_txn_index)
        assert pay.sender == Txn.sender, "Invalid repayment sender"
        assert pay.receiver == Global.current_application_address, "Invalid repayment receiver"
        assert pay.amount >= due, "Repayment too low"

        self.pool += due
        self.aura_earned[Txn.sender] = self.aura_earned.get(Txn.sender, UInt64(0)) + self._interest_to_aura_points(interest)

        if collateral > 0:
            itxn.AssetTransfer(
                xfer_asset=self.usdc_asset_id,
                asset_receiver=Txn.sender,
                asset_amount=collateral,
                fee=UInt64(0),
            ).submit()

        self.loan_active[Txn.sender] = UInt64(0)
        self.loan_type[Txn.sender] = UInt64(0)
        self.principal[Txn.sender] = UInt64(0)
        self.interest_due[Txn.sender] = UInt64(0)
        self.due_amount[Txn.sender] = UInt64(0)
        self.collateral_usdc[Txn.sender] = UInt64(0)
        self.due_ts[Txn.sender] = UInt64(0)

        return due

    @abimethod()
    def liquidate_default(self, borrower: Account) -> UInt64:
        assert Txn.sender == Global.creator_address, "Only admin"
        assert self.loan_active.get(borrower, UInt64(0)) == 1, "No active loan"
        assert Global.latest_timestamp > self.due_ts.get(borrower, UInt64(0)), "Loan not overdue"

        loan_type = self.loan_type.get(borrower, UInt64(0))
        interest = self.interest_due.get(borrower, UInt64(0))
        collateral = self.collateral_usdc.get(borrower, UInt64(0))

        self.aura_penalty[borrower] = self.aura_penalty.get(borrower, UInt64(0)) + self._interest_to_aura_points(interest)

        if loan_type == 2:
            self.aura_blacklisted[borrower] = UInt64(1)

        if collateral > 0:
            itxn.AssetTransfer(
                xfer_asset=self.usdc_asset_id,
                asset_receiver=Global.creator_address,
                asset_amount=collateral,
                fee=UInt64(0),
            ).submit()

        self.loan_active[borrower] = UInt64(0)
        self.loan_type[borrower] = UInt64(0)
        self.principal[borrower] = UInt64(0)
        self.interest_due[borrower] = UInt64(0)
        self.due_amount[borrower] = UInt64(0)
        self.collateral_usdc[borrower] = UInt64(0)
        self.due_ts[borrower] = UInt64(0)

        return interest

    @abimethod(readonly=True)
    def get_pool(self) -> UInt64:
        return self.pool

    @abimethod(readonly=True)
    def get_total_shares(self) -> UInt64:
        return self.total_shares

    @abimethod(readonly=True)
    def get_user_shares(self, user: Account) -> UInt64:
        return self.shares.get(user, UInt64(0))

    @abimethod(readonly=True)
    def get_active_loan(self, borrower: Account) -> UInt64:
        return self.loan_active.get(borrower, UInt64(0))

    @abimethod(readonly=True)
    def get_due_amount(self, borrower: Account) -> UInt64:
        return self.due_amount.get(borrower, UInt64(0))

    @abimethod(readonly=True)
    def get_due_ts(self, borrower: Account) -> UInt64:
        return self.due_ts.get(borrower, UInt64(0))

    @abimethod(readonly=True)
    def get_net_aura(self, borrower: Account) -> UInt64:
        return self._net_aura(borrower)

    @abimethod(readonly=True)
    def get_unsecured_credit_limit(self, borrower: Account) -> UInt64:
        return self._max_unsecured_amount_microalgo(borrower)

    @abimethod(readonly=True)
    def is_blacklisted(self, borrower: Account) -> UInt64:
        return self.aura_blacklisted.get(borrower, UInt64(0))
