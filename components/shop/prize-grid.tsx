'use client';

import { motion } from 'framer-motion';
import PrizeCard from './prize-card';

interface Prize {
  id: string;
  name: string;
  cost: number;
  stock: number;
  image_url: string | null;
}

interface User {
  id: string;
  tickets: number | null;
}

interface PrizeGridProps {
  prizes: Prize[];
  currentUser: User;
}

export default function PrizeGrid({ prizes, currentUser }: PrizeGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {prizes.map((prize, index) => (
        <motion.div
          key={prize.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <PrizeCard
            prize={prize}
            userTickets={currentUser.tickets || 0}
            userId={currentUser.id}
          />
        </motion.div>
      ))}
    </div>
  );
}

