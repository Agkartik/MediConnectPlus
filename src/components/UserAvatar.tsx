import { FC } from "react";

interface UserAvatarProps {
  avatar?: string;
  name?: string;
  className?: string;
}

const UserAvatar: FC<UserAvatarProps> = ({ avatar, name, className }) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  const isImage = avatar && (avatar.startsWith("data:image") || avatar.startsWith("http"));

  return (
    <div className={`rounded-full overflow-hidden flex items-center justify-center shrink-0 ${className}`}>
      {isImage ? (
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold">{avatar || initials}</span>
      )}
    </div>
  );
};

export default UserAvatar;
