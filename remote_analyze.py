import paramiko
import os

host = "93.127.142.144"
port = 22
user = "administrator"
password = "Ay**772283228"

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, port, user, password)
    
    # Comparing Firebase configurations and analyzing the crash
    commands = [
        "echo '--- Project google-services.json ---'",
        "cat /home/administrator/app2/google-services.json",
        "echo '--- Service Account Key ---'",
        "cat /home/administrator/app2/SERVICE_ACCOUNT_KEY.json",
        "echo '--- Capacitor Config ---'",
        "cat /home/administrator/app2/capacitor.config.json",
        "echo '--- Checking APK metadata if possible (aapt) ---'",
        "aapt dump badging /home/administrator/app2/output_apks/AXION_FINAL_1769860938.apk | grep -E 'package|sdkVersion' || echo 'aapt not found'",
        "echo '--- Checking for recent system logs (dmesg/journalctl) ---'",
        "journalctl -t app2 --since '1 hour ago' || tail -n 100 /var/log/syslog | grep -i 'app2' || echo 'No system logs accessible'"
    ]
    
    for cmd in commands:
        print(f"Executing: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode())
        print(stderr.read().decode())
        
    ssh.close()
except Exception as e:
    print(f"Error: {e}")
