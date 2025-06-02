import React from 'react';
import './LeagueSpinner.css';

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center h-screen bg-black">
      <div className="text-center p-8">
        <div role="status" className="flex flex-col items-center">
          <div className="league-spinner-container mb-4">
            <svg className='diamond small' viewBox="0 0 30 30">
              <path className='path' d="M1.56502 15L15 1.56502L28.4351 15L15 28.4351L1.56502 15Z"/>
            </svg>
            <svg className='diamond small rotated' viewBox="0 0 30 30">
              <path className='path' d="M1.56502 15L15 1.56502L28.4351 15L15 28.4351L1.56502 15Z"/>
            </svg>
            <div className='square centered'></div>
            <svg className='diamond large' viewBox="0 0 58 58">
              <path className='path' d="M1.42293 29L29 1.42293L56.5771 29L29 56.5771L1.42293 29Z"/>
            </svg>
            <svg className='diamond large rotated' viewBox="0 0 58 58">
              <path className='path' d="M1.42293 29L29 1.42293L56.5771 29L29 56.5771L1.42293 29Z"/>
            </svg>
            <div className='circle centered'></div>
          </div>
          <span className="text-lg font-semibold text-white mt-2">Crunching the numbers...</span>
          <p className="text-sm text-gray-300">Please wait while we process the data.</p>
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;