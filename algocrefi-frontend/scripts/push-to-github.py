#!/usr/bin/env python3
import subprocess
import sys
import os

# First find where .git is
result = subprocess.run(['find', '.', '-maxdepth', '3', '-name', '.git', '-type', 'd'], 
                       capture_output=True, text=True)
print(f"[v0] Find result: {result.stdout}")
print(f"[v0] CWD: {os.getcwd()}")

# Try using git directly from current location
try:
    result = subprocess.run(['git', 'rev-parse', '--show-toplevel'], 
                          capture_output=True, text=True, cwd=os.getcwd())
    if result.returncode == 0:
        project_dir = result.stdout.strip()
        print(f"[v0] Git root: {project_dir}")
    else:
        print(f"[v0] Git error: {result.stderr}")
        project_dir = os.getcwd()
except Exception as e:
    print(f"[v0] Exception finding git root: {e}")
    project_dir = os.getcwd()

print(f"[v0] Using directory: {project_dir}")

try:
    # Configure git
    subprocess.run(['git', 'config', '--global', 'user.email', 'v0[bot]@users.noreply.github.com'], 
                  capture_output=True, cwd=project_dir)
    subprocess.run(['git', 'config', '--global', 'user.name', 'v0 Bot'], 
                  capture_output=True, cwd=project_dir)
    
    # Git status
    print("\n[v0] Git status:")
    result = subprocess.run(['git', 'status'], capture_output=True, text=True, cwd=project_dir)
    print(result.stdout)
    
    # Add changes
    print("[v0] Adding changes...")
    result = subprocess.run(['git', 'add', '.'], capture_output=True, text=True, cwd=project_dir)
    print(f"[v0] Add result: {result.returncode}")
    
    # Commit
    print("[v0] Committing...")
    commit_msg = """feat: Add AlgoCrefi dark-luxury DeFi landing page

- Loader component with SVG stroke animation
- Custom cursor with magnetic interactions  
- Navbar with scroll hide/show and mobile hamburger
- Hero section with clip-path text reveals and stat counters
- Asymmetric bento grid with scroll reveals
- Horizontal scroll 'How It Works' section
- Aura credit score visualization
- Stats ticker marquee
- Diagonal footer with mobile responsive layout
- Global design system with Space Grotesk and Inter fonts
- Ambient orb drift animations and noise texture overlay"""
    
    result = subprocess.run(['git', 'commit', '-m', commit_msg], 
                          capture_output=True, text=True, cwd=project_dir)
    print(f"[v0] Commit result: {result.returncode}")
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    # Push
    print("[v0] Pushing to GitHub...")
    result = subprocess.run(['git', 'push', 'origin', 'HEAD'], 
                          capture_output=True, text=True, cwd=project_dir)
    print(f"[v0] Push result: {result.returncode}")
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    if result.returncode == 0:
        print("\n[v0] ✓ Successfully pushed to GitHub!")
    else:
        print(f"\n[v0] Push completed with code {result.returncode}")
        
except Exception as e:
    print(f"[v0] Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
