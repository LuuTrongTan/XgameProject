import User from "../models/user.model.js";

// 📌 1. Lấy cài đặt người dùng
export const getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "workingHours notificationPreferences calendarIntegration emailNotifications"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    res.json({
      success: true,
      data: {
        workingHours: user.workingHours,
        notificationPreferences: user.notificationPreferences,
        calendarIntegration: user.calendarIntegration,
        emailNotifications: user.emailNotifications,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy cài đặt:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy cài đặt người dùng",
      error: error.message,
    });
  }
};

// 📌 2. Cập nhật cài đặt chung
export const updateGeneralSettings = async (req, res) => {
  try {
    const { workingHours, emailNotifications } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Cập nhật giờ làm việc
    if (workingHours) {
      if (workingHours.startTime)
        user.workingHours.startTime = workingHours.startTime;
      if (workingHours.endTime)
        user.workingHours.endTime = workingHours.endTime;
      if (workingHours.timezone)
        user.workingHours.timezone = workingHours.timezone;
    }

    // Cập nhật cài đặt email
    if (typeof emailNotifications === "boolean") {
      user.emailNotifications = emailNotifications;
    }

    await user.save();

    res.json({
      success: true,
      message: "Cập nhật cài đặt thành công",
      data: {
        workingHours: user.workingHours,
        emailNotifications: user.emailNotifications,
      },
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật cài đặt:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật cài đặt",
      error: error.message,
    });
  }
};

// 📌 3. Cập nhật cài đặt thông báo
export const updateNotificationSettings = async (req, res) => {
  try {
    const { email, inApp } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Cập nhật cài đặt thông báo email
    if (email) {
      user.notificationPreferences.email = {
        ...user.notificationPreferences.email,
        ...email,
      };
    }

    // Cập nhật cài đặt thông báo trong ứng dụng
    if (inApp) {
      user.notificationPreferences.inApp = {
        ...user.notificationPreferences.inApp,
        ...inApp,
      };
    }

    await user.save();

    res.json({
      success: true,
      message: "Cập nhật cài đặt thông báo thành công",
      data: user.notificationPreferences,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật cài đặt thông báo:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật cài đặt thông báo",
      error: error.message,
    });
  }
};

// 📌 4. Cập nhật tích hợp lịch
export const updateCalendarIntegration = async (req, res) => {
  try {
    const { provider, connected, refreshToken, accessToken, expiryDate } =
      req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Kiểm tra provider hợp lệ
    if (!["googleCalendar", "outlookCalendar"].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: "Provider không hợp lệ",
      });
    }

    // Khởi tạo calendarIntegration nếu chưa tồn tại
    if (!user.calendarIntegration) {
      user.calendarIntegration = {
        googleCalendar: {
          connected: false,
          refreshToken: null,
          accessToken: null,
          expiryDate: null
        },
        outlookCalendar: {
          connected: false,
          refreshToken: null,
          accessToken: null,
          expiryDate: null
        }
      };
    }

    // Khởi tạo provider nếu chưa tồn tại
    if (!user.calendarIntegration[provider]) {
      user.calendarIntegration[provider] = {
        connected: false,
        refreshToken: null,
        accessToken: null,
        expiryDate: null
      };
    }

    // Cập nhật thông tin tích hợp
    user.calendarIntegration[provider] = {
      connected: connected ?? user.calendarIntegration[provider].connected,
      refreshToken:
        refreshToken ?? user.calendarIntegration[provider].refreshToken,
      accessToken:
        accessToken ?? user.calendarIntegration[provider].accessToken,
      expiryDate: expiryDate ?? user.calendarIntegration[provider].expiryDate,
    };

    await user.save();

    res.json({
      success: true,
      message: "Cập nhật tích hợp lịch thành công",
      data: user.calendarIntegration,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật tích hợp lịch:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật tích hợp lịch",
      error: error.message,
    });
  }
};

// 📌 5. Ngắt kết nối lịch
export const disconnectCalendar = async (req, res) => {
  try {
    const { provider } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Kiểm tra provider hợp lệ
    if (!["googleCalendar", "outlookCalendar"].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: "Provider không hợp lệ",
      });
    }

    // Khởi tạo calendarIntegration nếu chưa tồn tại
    if (!user.calendarIntegration) {
      user.calendarIntegration = {
        googleCalendar: {
          connected: false,
          refreshToken: null,
          accessToken: null,
          expiryDate: null
        },
        outlookCalendar: {
          connected: false,
          refreshToken: null,
          accessToken: null,
          expiryDate: null
        }
      };
    }

    // Khởi tạo provider nếu chưa tồn tại
    if (!user.calendarIntegration[provider]) {
      user.calendarIntegration[provider] = {
        connected: false,
        refreshToken: null,
        accessToken: null,
        expiryDate: null
      };
    }

    // Reset thông tin tích hợp
    user.calendarIntegration[provider] = {
      connected: false,
      refreshToken: null,
      accessToken: null,
      expiryDate: null,
    };

    await user.save();

    res.json({
      success: true,
      message: "Đã ngắt kết nối lịch thành công",
      data: user.calendarIntegration,
    });
  } catch (error) {
    console.error("Lỗi khi ngắt kết nối lịch:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi ngắt kết nối lịch",
      error: error.message,
    });
  }
};
