import request from "supertest";
import app from "../app.js";

describe("Task API", () => {
  it("should create a new task", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({
        title: "Fix bug",
        description: "Fix the login bug",
        priority: "High",
        assignedTo: ["userId1"],
      });
    expect(res.status).toBe(201);
  });

  it("should fetch all tasks", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(200);
  });
});
