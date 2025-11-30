import { Router } from 'express';
import { createSSHConnection } from '../../utils/ssh-connection';
import authenticate from '../../middleware/auth';

const router = Router();

// ✅ Test SSH Connection
router.post('/api/ssh/test-connection', authenticate, async (req, res) => {
  try {
    console.log('🔌 [SSH] اختبار الاتصال...');
    const ssh = createSSHConnection();
    
    await ssh.connect();
    const result = await ssh.executeCommand('echo "✅ SSH Connection Successful" && whoami');
    ssh.disconnect();
    
    res.json({
      success: true,
      message: 'تم الاتصال بنجاح',
      output: result.trim(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'فشل الاتصال',
      error: error.message,
    });
  }
});

// ✅ Execute Remote Command
router.post('/api/ssh/execute', authenticate, async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        message: 'يجب توفير الأمر (command)',
      });
    }

    console.log(`🚀 [SSH] تنفيذ الأمر: ${command}`);
    const ssh = createSSHConnection();
    
    await ssh.connect();
    const result = await ssh.executeCommand(command);
    ssh.disconnect();
    
    res.json({
      success: true,
      command,
      output: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'فشل تنفيذ الأمر',
      error: error.message,
    });
  }
});

// ✅ Get Server Info
router.get('/api/ssh/server-info', authenticate, async (req, res) => {
  try {
    const ssh = createSSHConnection();
    
    await ssh.connect();
    
    const osInfo = await ssh.executeCommand('cat /etc/os-release | grep PRETTY_NAME');
    const uptime = await ssh.executeCommand('uptime');
    const diskUsage = await ssh.executeCommand('df -h / | tail -1');
    const memoryUsage = await ssh.executeCommand('free -h | grep Mem');
    
    ssh.disconnect();
    
    res.json({
      success: true,
      osInfo: osInfo.trim(),
      uptime: uptime.trim(),
      diskUsage: diskUsage.trim(),
      memoryUsage: memoryUsage.trim(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'فشل جلب معلومات الـ Server',
      error: error.message,
    });
  }
});

export default router;
