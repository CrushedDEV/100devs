import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  /** Optional team colour rendered as a ring. */
  ringColor?: string | null;
}

export function UserAvatar({
  name,
  avatarUrl,
  className,
  ringColor,
}: UserAvatarProps) {
  return (
    <Avatar
      className={cn("size-7 ring-1 ring-border", className)}
      style={ringColor ? { boxShadow: `0 0 0 1.5px ${ringColor}` } : undefined}
    >
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
