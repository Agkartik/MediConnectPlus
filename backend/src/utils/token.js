import jwt from "jsonwebtoken";

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function hasCoords(lat, lng) {
  return typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng);
}

export function userToClient(user) {
  const base = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar || "",
    approved: user.role === "patient" || user.role === "admin" ? true : user.approved !== false,
  };
  if (user.role === "patient") {
    base.age = user.age;
    base.dob = user.dob;
    base.phone = user.phone;
    base.gender = user.gender;
    base.bloodGroup = user.bloodGroup;
    base.condition = user.condition;
    base.healthStatus = user.healthStatus;
    base.hasLocation = hasCoords(user.latitude, user.longitude);
    base.latitude = user.latitude ?? null;
    base.longitude = user.longitude ?? null;
  }
  if (user.role === "doctor") {
    base.specialty = user.specialty;
    base.fee = user.fee;
    base.license = user.license;
    base.qualification = user.qualification;
    base.experience = user.experience;
    base.hasClinicLocation = hasCoords(user.latitude, user.longitude);
  }
  return base;
}
