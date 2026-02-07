import React from 'react';
import { motion } from 'framer-motion';

const PageContainer = ({ children, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`page-container ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default PageContainer;
