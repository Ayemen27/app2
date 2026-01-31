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
        "echo '--- Running AXION Analysis on APK ---'",
        "cd /home/administrator/app2/tools/axion-test-engine && bash axion-test.sh /home/administrator/app2/output_apks/AXION_FINAL_1769860938.apk",
        "echo '--- Checking for error logs in reports ---'",
        "find /home/administrator/app2/tools/axion-test-engine/reports -type f -exec grep -lEi 'error|crash|failed|exception' {} + | xargs cat | head -n 50",
        "echo '--- Verification of Firebase Project IDs ---'",
        "grep -r 'app2-eb4df' /home/administrator/app2/google-services.json",
        "grep -r 'pelagic-quanta' /home/administrator/app2/SERVICE_ACCOUNT_KEY.json"
    ]
    
    for cmd in commands:
        print(f"Executing: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode())
        print(stderr.read().decode())
        
    ssh.close()
except Exception as e:
    print(f"Error: {e}")
