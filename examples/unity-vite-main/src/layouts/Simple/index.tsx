import React from 'react';

const SimpleLayout = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className="flex w-full flex-col">
      <main className="m-auto grow-1">{children}</main>
    </div>
  );
};

export default React.memo(SimpleLayout);
