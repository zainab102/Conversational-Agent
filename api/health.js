module.exports = (req, res) => {
  return res.status(200).json({
    status: 'OK',
    message: 'Conversational Agent API is running',
    version: '1.0.0'
  });
};
