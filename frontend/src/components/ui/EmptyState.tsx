import React from "react";
import { PackageOpen } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-lg border border-dashed border-[#DDD6CA] bg-white">
      <div className="p-3 bg-[#F3EDE6] text-[#A58B6F] rounded-full mb-3">
        {icon || <PackageOpen className="w-8 h-8 text-[#A58B6F]" />}
      </div>
      <h3 className="text-base font-semibold text-[#292824] mb-1">{title}</h3>
      <p className="text-xs text-[#88847D] max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
