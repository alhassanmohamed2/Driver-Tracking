import os
import subprocess
from datetime import datetime
import glob

# Backup directory mapped to the Docker volume
BACKUP_DIR = "/app/backups"
MAX_BACKUPS = 2

import re

# Database credentials (parsed from DATABASE_URL)
database_url = os.environ.get("DATABASE_URL", "mysql+mysqlconnector://user:password@db/trips_db")
# Example: mysql+mysqlconnector://user:password@db/trips_db
match = re.search(r"://([^:]+):([^@]+)@([^/]+)/(.+)", database_url)

if match:
    DB_USER, DB_PASS, DB_HOST, DB_NAME = match.groups()
else:
    # Fallback to defaults
    DB_HOST = "db"
    DB_USER = "user"
    DB_PASS = "password"
    DB_NAME = "trips_db"

def init_backup_dir():
    """Ensure the backup directory exists."""
    os.makedirs(BACKUP_DIR, exist_ok=True)

def create_backup() -> str:
    """
    Creates a new MySQL dump of the database.
    Returns the filename of the created backup or raises an Exception.
    """
    init_backup_dir()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.sql"
    filepath = os.path.join(BACKUP_DIR, filename)
    
    # mysqldump command
    cmd = [
        "mysqldump",
        f"-h{DB_HOST}",
        f"-u{DB_USER}",
        f"-p{DB_PASS}",
        "--skip-ssl",
        DB_NAME
    ]
    
    # Execute and write to file
    try:
        with open(filepath, "w") as outfile:
            subprocess.run(cmd, stdout=outfile, stderr=subprocess.PIPE, check=True)
        
        # After a successful backup, clean up old ones
        cleanup_old_backups()
        return filename
    except subprocess.CalledProcessError as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise Exception(f"Backup failed: {e.stderr.decode()}")
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise e

def cleanup_old_backups():
    """
    Keeps only the MAX_BACKUPS most recent backup files and deletes the rest.
    """
    init_backup_dir()
    
    # Find all .sql files in the backup directory
    search_pattern = os.path.join(BACKUP_DIR, "*.sql")
    backup_files = glob.glob(search_pattern)
    
    if len(backup_files) <= MAX_BACKUPS:
        return
        
    # Sort files by modification time (oldest first)
    backup_files.sort(key=os.path.getmtime)
    
    # Delete the oldest files until we only have MAX_BACKUPS left
    files_to_delete = backup_files[:-MAX_BACKUPS]
    for file_path in files_to_delete:
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Failed to delete old backup {file_path}: {e}")

def restore_backup(filename: str):
    """
    Restores the database from a specific .sql backup file.
    """
    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Backup file {filename} not found.")

    cmd = [
        "mysql",
        f"-h{DB_HOST}",
        f"-u{DB_USER}",
        f"-p{DB_PASS}",
        "--skip-ssl",
        DB_NAME
    ]
    
    try:
        with open(filepath, "r") as infile:
            subprocess.run(cmd, stdin=infile, stderr=subprocess.PIPE, check=True)
    except subprocess.CalledProcessError as e:
        raise Exception(f"Restore failed: {e.stderr.decode()}")

def get_backup_list() -> list:
    """
    Returns a list of available backups with their creation time and size.
    """
    init_backup_dir()
    search_pattern = os.path.join(BACKUP_DIR, "*.sql")
    backup_files = glob.glob(search_pattern)
    
    # Sort newest first
    backup_files.sort(key=os.path.getmtime, reverse=True)
    
    results = []
    for fp in backup_files:
        stats = os.stat(fp)
        size_mb = round(stats.st_size / (1024 * 1024), 2)
        results.append({
            "filename": os.path.basename(fp),
            "created_at": datetime.fromtimestamp(stats.st_mtime).isoformat(),
            "size_mb": size_mb
        })
        
    return results
