import request from "supertest";
import app from "../app.js";

describe("User API", () => {
  it("should register a new user", async () => {
    const res = await request(app).post("/api/users/register").send({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    });
    expect(res.status).toBe(201);
  });

  it("should fail login with wrong password", async () => {
    const res = await request(app).post("/api/users/login").send({
      email: "test@example.com",
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
  });
});
