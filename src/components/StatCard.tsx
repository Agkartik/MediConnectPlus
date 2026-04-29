import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon: ReactNode;
  gradient?: string;
}

const StatCard = ({ title, value, change, positive, icon, gradient = "gradient-primary" }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    className="p-6 rounded-2xl bg-card shadow-card border border-border/50 hover:shadow-elevated transition-all"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center`}>
        {icon}
      </div>
      {change && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          {change}
        </span>
      )}
    </div>
    <p className="text-sm text-muted-foreground mb-1">{title}</p>
    <p className="text-2xl font-heading font-bold">{value}</p>
  </motion.div>
);

export default StatCard;
