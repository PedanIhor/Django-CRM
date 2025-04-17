import React from 'react';
import Confetti from 'react-confetti';

interface ConfettiAnimationProps {
    run: boolean;
}

const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({ run }) => {
    return (
        <>
            {run && (
                <Confetti
                    // width={window.innerWidth}
                    // height={window.innerHeight}
                    numberOfPieces={500} // Number of confetti pieces
                    gravity={0.2} // Controls how fast the confetti falls
                    // initialVelocityX={5} // Horizontal speed
                    // initialVelocityY={1} // Vertical speed
                    // recycle={false} // Stops after all pieces fall
                    colors={['#1976D2', '#808080', '#008000', '#1A3353']} // Custom colors
                    // confettiSource={{ x: 0, y: 0, w: window.innerWidth, h: 0 }} // Emit from the top
                    particleSize={1000} // Size of the confetti flakes
                />
            )}
        </>
    );
};

export default ConfettiAnimation;