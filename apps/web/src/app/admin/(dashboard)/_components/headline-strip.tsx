import { Card, CardContent } from "@workspace/ui/components/card";

type HeadlineStripProps = {
  children: React.ReactNode;
};

export function HeadlineStrip({ children }: HeadlineStripProps) {
  return (
    <Card className="py-0">
      <CardContent className="grid divide-y px-0 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {children}
      </CardContent>
    </Card>
  );
}
