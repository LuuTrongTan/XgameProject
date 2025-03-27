export const updateProfile = async (req, res) => {
  try {
    const { name, email, position, department } = req.body;
    const avatarBase64 = req.body.avatar; // Nhận base64 string từ frontend

    // Validate email format
    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    // Check if email already exists
    if (email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.user.id },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email đã được sử dụng",
        });
      }
    }

    // Update user profile
    const updateData = {
      ...(name && { name }),
      ...(email && { email: email.toLowerCase() }),
      ...(position && { position }),
      ...(department && { department }),
      ...(avatarBase64 && { avatarBase64 }), // Cập nhật avatarBase64 nếu có
    };

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
    }).select("-password");

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: user,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thông tin",
      error: error.message,
    });
  }
};
