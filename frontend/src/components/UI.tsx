// src/components/UI.tsx
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";

/*  Utilidad                                                                  */

/** Combina clases condicionalmente ignorando valores falsy. */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/*  Card                                                                      */

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Contenido alineado a la derecha del encabezado (botones, badges...). */
  actions?: ReactNode;
  /** Elimina el padding del cuerpo (útil para waveforms o canvas a sangre). */
  flush?: boolean;
}

export function Card({
  title,
  subtitle,
  actions,
  flush = false,
  className,
  children,
  ...rest
}: CardProps) {
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <section
      className={cn(
        "rounded-xl border border-gray-800 bg-gray-900 shadow-lg shadow-black/30",
        className,
      )}
      {...rest}
    >
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 border-b border-gray-800 px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h3 className="truncate text-sm font-semibold tracking-wide text-gray-100 uppercase">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={cn(!flush && "p-5")}>{children}</div>
    </section>
  );
}

/*  Botones                                                                   */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Muestra un spinner y deshabilita el botón. */
  loading?: boolean;
  /** Icono de lucide-react (se pasa el componente, no el elemento). */
  icon?: LucideIcon;
}

type ButtonVariant = "primary" | "secondary";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white shadow-sm shadow-indigo-950/50 hover:bg-indigo-500 active:bg-indigo-700",
  secondary:
    "border border-gray-700 bg-gray-800 text-gray-200 hover:border-gray-600 hover:bg-gray-700 active:bg-gray-800",
};

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
    />
  );
}

interface InternalButtonProps extends ButtonProps {
  variant: ButtonVariant;
}

function Button({
  variant,
  loading = false,
  icon: Icon,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: InternalButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], className)}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : (
        Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <Button variant="secondary" {...props} />;
}

/*  Badge                                                                     */

type BadgeTone = "neutral" | "success" | "warning" | "info";

interface BadgeProps {
  tone?: BadgeTone;
  /** Muestra un punto de estado a la izquierda. */
  dot?: boolean;
  /** Anima el punto (indicador "en vivo"). */
  pulse?: boolean;
  className?: string;
  children: ReactNode;
}

const BADGE_TONES: Record<BadgeTone, { wrapper: string; dot: string }> = {
  neutral: { wrapper: "text-gray-300", dot: "bg-gray-500" },
  success: { wrapper: "text-gray-300", dot: "bg-emerald-500" },
  warning: { wrapper: "text-gray-300", dot: "bg-amber-500" },
  info: { wrapper: "text-indigo-300", dot: "bg-indigo-500" },
};

export function Badge({
  tone = "neutral",
  dot = false,
  pulse = false,
  className,
  children,
}: BadgeProps) {
  const styles = BADGE_TONES[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 px-3 py-1 text-xs font-medium",
        styles.wrapper,
        className,
      )}
    >
      {dot && (
        <span className="relative flex size-2" aria-hidden="true">
          {pulse && (
            <span
              className={cn(
                "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                styles.dot,
              )}
            />
          )}
          <span className={cn("relative inline-flex size-2 rounded-full", styles.dot)} />
        </span>
      )}
      {children}
    </span>
  );
}

/*  EmptyState                                                                */

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-gray-800 bg-gray-950">
        <Icon className="size-6 text-indigo-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-gray-200">{title}</p>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  );
}

/*  ModuleTemplate                                                            */

interface ModuleTemplateProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Acciones globales del módulo, alineadas a la derecha del encabezado. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Plantilla unificada para todos los módulos: encabezado estándar
 * (icono, título, subtítulo, acciones) y cuerpo con espaciado consistente.
 * Dentro del cuerpo se recomienda componer con <Card>.
 */
export function ModuleTemplate({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
}: ModuleTemplateProps) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-gray-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-600/15">
              <Icon className="size-5 text-indigo-400" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-gray-50">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </header>

      <div className="space-y-6">{children}</div>
    </div>
  );
}