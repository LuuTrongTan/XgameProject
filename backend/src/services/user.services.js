import UserModel from "../models/user.model.js";
import bcrypt from "bcryptjs";

class UserService {
  async createUser(username, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return await UserModel.create({
      username,
      email,
      password: hashedPassword,
    });
  }

  async findUserByEmail(email) {
    return await UserModel.findOne({ email });
  }
}

export default new UserService();
