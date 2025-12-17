interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  message = "Loading", 
  size = 'md',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-24 w-24'
  };

  const dotSize = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3'
  };

  const textSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const content = (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full border-4 border-muted`}></div>
        <div className={`absolute top-0 left-0 ${sizeClasses[size]} rounded-full border-4 border-primary border-t-transparent animate-spin`}></div>
      </div>
      <div className="text-center space-y-2">
        <h2 className={`${textSize[size]} font-semibold text-foreground`}>FuturaHire</h2>
        <p className="text-muted-foreground">{message}</p>
      </div>
      <div className="flex gap-1.5">
        <div className={`${dotSize[size]} rounded-full bg-primary animate-bounce`} style={{ animationDelay: '0ms' }}></div>
        <div className={`${dotSize[size]} rounded-full bg-primary animate-bounce`} style={{ animationDelay: '150ms' }}></div>
        <div className={`${dotSize[size]} rounded-full bg-primary animate-bounce`} style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16">
      {content}
    </div>
  );
}
