declare module 'react-confetti' {
    import React from 'react';

    interface ConfettiProps {
        width?: number;
        height?: number;
        numberOfPieces?: number;
        recycle?: boolean;
        run?: boolean;
        [key: string]: any; // Allow additional props
    }

    const Confetti: React.FC<ConfettiProps>;
    export default Confetti;
}