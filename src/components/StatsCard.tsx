interface StatsCardProps {
  title: string;
  value: string;
  icon?: string;
}

const StatsCard = ({ title, value, icon }: StatsCardProps) => {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <p className="stat-label">{title}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <p className="stat-value">{value}</p>
    </div>
  );
};

export default StatsCard; 