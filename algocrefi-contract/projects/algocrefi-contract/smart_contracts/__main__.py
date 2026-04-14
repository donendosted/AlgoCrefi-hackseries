import dataclasses
import importlib
import logging
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from shutil import rmtree

from algokit_utils.config import config
from dotenv import load_dotenv

config.configure(debug=True, trace_all=False)

logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s %(levelname)-10s: %(message)s"
)
logger = logging.getLogger(__name__)
logger.info("Loading .env")
load_dotenv()

root_path = Path(__file__).parent


# ----------------------- Contract Configuration ----------------------- #

@dataclasses.dataclass
class SmartContract:
    path: Path
    name: str
    deploy: Callable[[], None] | None = None


def import_contract(folder: Path) -> Path:
    contract_path = folder / "contract.py"
    if contract_path.exists():
        return contract_path
    else:
        raise Exception(f"Contract not found in {folder}")

def import_deploy_if_exists(folder: Path) -> Callable[[], None] | None:
    try:
        module_name = f"{folder.parent.name}.{folder.name}.deploy_config"
        deploy_module = importlib.import_module(module_name)
        return deploy_module.deploy
    except Exception as e:   # 🔥 catch EVERYTHING
        print(f"❌ Failed to load deploy_config for {folder.name}: {e}")
        return None


def has_contract_file(directory: Path) -> bool:
    return (directory / "contract.py").exists()


contracts: list[SmartContract] = [
    SmartContract(
        path=import_contract(folder),
        name=folder.name,
        deploy=import_deploy_if_exists(folder),
    )
    for folder in root_path.iterdir()
    if folder.is_dir() and has_contract_file(folder) and not folder.name.startswith("_")
]


# -------------------------- Build Logic -------------------------- #

deployment_extension = "py"


def _get_output_path(output_dir: Path, deployment_extension: str, contract_name: str) -> Path:
    return output_dir / f"{contract_name}_client.{deployment_extension}"


def build(output_dir: Path, contract_path: Path) -> Path:
    output_dir = output_dir.resolve()

    if output_dir.exists():
        rmtree(output_dir)

    output_dir.mkdir(exist_ok=True, parents=True)

    logger.info(f"Exporting {contract_path} to {output_dir}")

    # 🔨 Compile contract
    build_result = subprocess.run(
        [
            "algokit",
            "--no-color",
            "compile",
            "python",
            str(contract_path.resolve()),
            f"--out-dir={output_dir}",
            "--output-source-map",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    if build_result.stdout:
        print(build_result.stdout)

    if build_result.returncode:
        raise Exception(f"Could not build contract:\n{build_result.stdout}")

    # 📦 Generate client
    app_spec_files = list(output_dir.glob("*.arc56.json"))

    if not app_spec_files:
        logger.warning("No ARC56 file found, skipping client generation.")
        return output_dir

    for spec_file in app_spec_files:
        print(spec_file.name)

        generate_result = subprocess.run(
            [
                "/home/rupam/.local/bin/algokitgen-py",
                "-a",
                str(spec_file),
                "-o",
                str(_get_output_path(output_dir, deployment_extension, output_dir.name)),
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        if generate_result.stdout:
            print(generate_result.stdout)

        if generate_result.returncode:
            raise Exception(
                f"Client generation failed:\n{generate_result.stdout}"
            )

    return output_dir


# --------------------------- Main Logic --------------------------- #

def main(action: str, contract_name: str | None = None) -> None:
    artifact_path = root_path / "artifacts"

    filtered_contracts = [
        contract
        for contract in contracts
        if contract_name is None or contract.name == contract_name
    ]

    match action:
        case "build":
            for contract in filtered_contracts:
                logger.info(f"Building app at {contract.path}")
                build(artifact_path / contract.name, contract.path)

        case "deploy":
            for contract in filtered_contracts:
                output_dir = artifact_path / contract.name

                app_spec_file = next(
                    (
                        file
                        for file in output_dir.iterdir()
                        if file.suffixes == [".arc56", ".json"]
                    ),
                    None,
                )

                if app_spec_file is None:
                    raise Exception("ARC56 file not found for deployment")

                if contract.deploy:
                    logger.info(f"Deploying app {contract.name}")
                    contract.deploy()

        case "all":
            for contract in filtered_contracts:
                logger.info(f"Building app at {contract.path}")
                build(artifact_path / contract.name, contract.path)

                if contract.deploy:
                    logger.info(f"Deploying {contract.name}")
                    contract.deploy()

        case _:
            logger.error(f"Unknown action: {action}")


if __name__ == "__main__":
    if len(sys.argv) > 2:
        main(sys.argv[1], sys.argv[2])
    elif len(sys.argv) > 1:
        main(sys.argv[1])
    else:
        main("all")