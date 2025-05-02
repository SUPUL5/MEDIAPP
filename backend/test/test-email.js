const { sendEmail } = require('../utils/emailService');

async function testEmailService() {
  console.log('Testing email service...');
  try {
    const result = await sendEmail(
      'sssasidu@gmail.com',  // Replace with a real email address
      'Test Email from Node.js Application',
      'This is a test email sent from the Node.js application to verify the email service is working correctly.'
    );
    
    console.log('Email test result:', result ? 'Success' : 'Failed');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testEmailService();