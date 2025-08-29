const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: "dlugbxmkm",   // Cloudinary Cloud Name
  api_key: "565685716285556",         // Cloudinary API Key
  api_secret: "aznWpIeosswdB_-NELq_T9HDD8E"    // Cloudinary API Secret
});

module.exports = async (req, res) => {
  const { public_id } = req.query;
  if(!public_id) return res.status(400).json({ success: false, message: "No public_id provided" });

  try {
    await cloudinary.uploader.destroy(public_id);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
