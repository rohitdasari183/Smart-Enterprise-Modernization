'use client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

export default function VehicleChart({ data = [] as number[] }) {
  const chart = {
    labels: data.map((_, i) => `T${i + 1}`),
    datasets: [
      {
        label: 'Speed (km/h)',
        data,
        borderColor: '#0ea5b7',
        tension: 0.3,
        fill: false,
      },
    ],
  };
  return (
    <div>
      <Line data={chart} />
    </div>
  );
}
