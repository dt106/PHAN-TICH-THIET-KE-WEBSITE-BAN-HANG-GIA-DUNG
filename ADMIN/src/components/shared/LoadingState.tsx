
import { LoaderCircle } from 'lucide-react';

interface LoadingStateProps {
    message?: string;
    fullScreen?: boolean;
}

export function LoadingState({
    message = 'Đang tải dữ liệu...',
    fullScreen = false,
}: LoadingStateProps) {
    return (
        <div
            className={[
                'flex flex-col items-center justify-center gap-3',
                fullScreen ? 'min-h-screen' : 'min-h-[200px] w-full',
            ].join(' ')}
        >
            <LoaderCircle className="h-8 w-8 animate-spin text-[#65D928]" />

            <p className="text-sm text-[#B5B7B6]">
                {message}
            </p>
        </div>
    );
}

export default LoadingState;
