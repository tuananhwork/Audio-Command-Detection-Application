import React from 'react';
import styled from 'styled-components';

const RecordButton = ({ onRecord, recording, countdown, loading, showKeyboardHint }) => {
  return (
    <StyledWrapper>
      <button onClick={onRecord} disabled={loading || recording} className={recording ? 'recording' : ''}>
        {recording ? `Recording (${countdown}s)` : 'Record (3s)'}
        <div id="clip">
          <div id="leftTop" className="corner" />
          <div id="rightBottom" className="corner" />
          <div id="rightTop" className="corner" />
          <div id="leftBottom" className="corner" />
        </div>
        <span id="rightArrow" className="arrow" />
        <span id="leftArrow" className="arrow" />
      </button>
      {showKeyboardHint && !recording && <span className="keyboard-hint">Press Space to record</span>}
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  button {
    position: relative;
    width: 11em;
    height: 4em;
    outline: none;
    transition: 0.1s;
    background-color: transparent;
    border: none;
    font-size: 13px;
    font-weight: bold;
    color: var(--text-primary);
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  button.recording {
    color: var(--error-color);
  }

  .keyboard-hint {
    font-size: 0.8rem;
    opacity: 0.7;
    margin-left: 0.5rem;
  }

  #clip {
    --color: var(--accent-color);
    position: absolute;
    top: 0;
    overflow: hidden;
    width: 100%;
    height: 100%;
    border: 5px double var(--color);
    box-shadow: inset 0px 0px 15px rgba(99, 102, 241, 0.3);
    -webkit-clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  }

  .arrow {
    position: absolute;
    transition: 0.2s;
    background-color: var(--accent-color);
    top: 35%;
    width: 11%;
    height: 30%;
  }

  #leftArrow {
    left: -13.5%;
    -webkit-clip-path: polygon(100% 0, 100% 100%, 0 50%);
  }

  #rightArrow {
    -webkit-clip-path: polygon(100% 49%, 0 0, 0 100%);
    left: 102%;
  }

  button:hover:not(:disabled) #rightArrow {
    background-color: var(--success-color);
    left: -15%;
    animation: 0.6s ease-in-out both infinite alternate rightArrow8;
  }

  button:hover:not(:disabled) #leftArrow {
    background-color: var(--success-color);
    left: 103%;
    animation: 0.6s ease-in-out both infinite alternate leftArrow8;
  }

  .corner {
    position: absolute;
    width: 4em;
    height: 4em;
    background-color: var(--accent-color);
    box-shadow: inset 1px 1px 8px rgba(99, 102, 241, 0.5);
    transform: scale(1) rotate(45deg);
    transition: 0.2s;
  }

  #rightTop {
    top: -1.98em;
    left: 91%;
  }

  #leftTop {
    top: -1.96em;
    left: -3em;
  }

  #leftBottom {
    top: 2.1em;
    left: -2.15em;
  }

  #rightBottom {
    top: 45%;
    left: 88%;
  }

  button:hover:not(:disabled) #leftTop {
    animation: 0.1s ease-in-out 0.05s both changeColor8, 0.2s linear 0.4s both lightEffect8;
  }

  button:hover:not(:disabled) #rightTop {
    animation: 0.1s ease-in-out 0.15s both changeColor8, 0.2s linear 0.4s both lightEffect8;
  }

  button:hover:not(:disabled) #rightBottom {
    animation: 0.1s ease-in-out 0.25s both changeColor8, 0.2s linear 0.4s both lightEffect8;
  }

  button:hover:not(:disabled) #leftBottom {
    animation: 0.1s ease-in-out 0.35s both changeColor8, 0.2s linear 0.4s both lightEffect8;
  }

  button:hover:not(:disabled) .corner {
    transform: scale(1.25) rotate(45deg);
  }

  button:hover:not(:disabled) #clip {
    animation: 0.2s ease-in-out 0.55s both greenLight8;
    --color: var(--success-color);
  }

  @keyframes changeColor8 {
    from {
      background-color: var(--accent-color);
    }
    to {
      background-color: var(--success-color);
    }
  }

  @keyframes lightEffect8 {
    from {
      box-shadow: 1px 1px 5px var(--success-color);
    }
    to {
      box-shadow: 0 0 2px var(--success-color);
    }
  }

  @keyframes greenLight8 {
    from {
    }
    to {
      box-shadow: inset 0px 0px 32px rgba(16, 185, 129, 0.3);
    }
  }

  @keyframes leftArrow8 {
    from {
      transform: translate(0px);
    }
    to {
      transform: translateX(10px);
    }
  }

  @keyframes rightArrow8 {
    from {
      transform: translate(0px);
    }
    to {
      transform: translateX(-10px);
    }
  }

  /* Dark mode styles */
  [data-theme='dark'] & {
    button {
      color: #ddebf0;
    }

    button.recording {
      color: #ff4444;
    }

    #clip {
      --color: #2761c3;
      box-shadow: inset 0px 0px 15px #195480;
    }

    .arrow {
      background-color: #2761c3;
    }

    .corner {
      background-color: #2761c3;
      box-shadow: inset 1px 1px 8px #2781c3;
    }

    button:hover:not(:disabled) #rightArrow,
    button:hover:not(:disabled) #leftArrow {
      background-color: #27c39f;
    }

    button:hover:not(:disabled) #clip {
      --color: #27c39f;
    }

    @keyframes changeColor8 {
      from {
        background-color: #2781c3;
      }
      to {
        background-color: #27c39f;
      }
    }

    @keyframes lightEffect8 {
      from {
        box-shadow: 1px 1px 5px #27c39f;
      }
      to {
        box-shadow: 0 0 2px #27c39f;
      }
    }

    @keyframes greenLight8 {
      from {
      }
      to {
        box-shadow: inset 0px 0px 32px #27c39f;
      }
    }
  }
`;

export default RecordButton;
