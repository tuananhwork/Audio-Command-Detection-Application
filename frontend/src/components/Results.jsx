import React from 'react';
import Loader from './Loader';
import { COMMAND_MAPPING, COMMAND_STATUS } from '../constants/commands';
import { getPredictionClass, getCommandStatusText } from '../utils/helpers';

const Results = ({ result, loading }) => {
  return (
    <div className="results animate-in">
      {loading && (
        <div className="loading-container animate-in">
          <Loader />
          <p>Processing...</p>
        </div>
      )}

      {result && !loading && (
        <>
          <div className="results__section">
            <h2 className="results__title">Predicted Command</h2>
            <div className="prediction">
              <div
                className={`prediction__command ${getPredictionClass(
                  result.data.predicted_class,
                  result.data.confidence
                )} animate-in`}
              >
                {result.data.predicted_class === 'unknown' ? (
                  <>
                    <span className="unknown-icon">❓</span>
                    {COMMAND_MAPPING[result.data.predicted_class]}
                  </>
                ) : (
                  COMMAND_MAPPING[result.data.predicted_class] || result.data.predicted_class
                )}
                <span className="prediction__confidence">{(result.data.confidence * 100).toFixed(2)}%</span>
              </div>
              {getCommandStatusText(result) && (
                <div className={`prediction__status ${result.data.command_status}`}>{getCommandStatusText(result)}</div>
              )}
            </div>
          </div>

          <div className="results__section">
            <h2 className="results__title">Top 3 Predictions</h2>
            <ul className="top-predictions">
              {result.data.top3_predictions.map(([command, confidence], index) => (
                <li
                  key={index}
                  className="top-predictions__item animate-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <span className="top-predictions__command">{COMMAND_MAPPING[command] || command}</span>
                  <span className="top-predictions__confidence">{(confidence * 100).toFixed(2)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="results__section">
        <h2 className="results__title">Supported Commands</h2>
        <div className="command-list">
          {Object.entries(COMMAND_MAPPING)
            .filter(([key]) => key !== 'unknown')
            .map(([key, command], index) => (
              <div key={key} className="command-item animate-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <span className="command-number">{index + 1}.</span>
                <span className="command-text">{command}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Results;
