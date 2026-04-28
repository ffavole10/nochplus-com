interface NeuralOsHeaderProps {
  title: string;
  description: string;
}

/**
 * Standard page header used inside every Neural OS tab.
 * Title format: "<Layer> | Neural OS"
 */
export function NeuralOsHeader({ title, description }: NeuralOsHeaderProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-3xl">{description}</p>
    </div>
  );
}
