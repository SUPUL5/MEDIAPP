const mockEmailService = {
    sendEmail: jest.fn().mockImplementation((email, subject, content) => {
        console.log('Mock email sent:', { email, subject, content });
        return Promise.resolve(true);
    }),
    transporter: {
        verify: jest.fn().mockImplementation((callback) => {
            callback(null, true);
        })
    }
};

module.exports = mockEmailService;
