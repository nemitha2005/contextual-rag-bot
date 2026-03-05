import Form from "next/form";

import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function AuthForm({
  action,
  children,
  defaultEmail = "",
  showName = false,
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
  showName?: boolean;
}) {
  return (
    <Form action={action} className="flex flex-col gap-4 px-4 sm:px-16">
      {showName && (
        <div className="flex flex-col gap-2">
          <Label
            className="font-normal text-zinc-600 dark:text-zinc-400"
            htmlFor="name"
          >
            Full Name
          </Label>
          <Input
            autoComplete="name"
            autoFocus
            className="bg-muted text-md md:text-sm"
            id="name"
            name="name"
            placeholder="John Doe"
            required
            type="text"
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label
          className="font-normal text-zinc-600 dark:text-zinc-400"
          htmlFor="email"
        >
          Email Address
        </Label>

        <Input
          autoComplete="email"
          autoFocus
          className="bg-muted text-md md:text-sm"
          defaultValue={defaultEmail}
          id="email"
          name="email"
          placeholder="user@yourmail.com"
          required
          type="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          className="font-normal text-zinc-600 dark:text-zinc-400"
          htmlFor="password"
        >
          Password
        </Label>

        <Input
          className="bg-muted text-md md:text-sm"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {children}
    </Form>
  );
}
