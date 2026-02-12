interface StatCardProps {
  value: string
  label: string
  icon: React.ReactNode
}

export default function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <div className="card-gradient border border-white/5 rounded-xl p-6 flex items-start justify-between">
      <div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
      <div className="w-10 h-10 rounded-lg bg-dark-500 flex items-center justify-center text-gray-400">
        {icon}
      </div>
    </div>
  )
}
