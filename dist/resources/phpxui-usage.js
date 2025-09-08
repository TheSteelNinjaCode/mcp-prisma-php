import z from "zod";
const PatternEnum = z.enum([
    "with-trigger",
    "controlled-open",
    "basic",
    "as-child",
    "icon",
    "default-checked",
    "controlled",
]);
function dialogDoc(tailwind) {
    const contentWidth = tailwind ? ` class="sm:max-w-[425px]"` : "";
    return {
        name: "Dialog",
        requires: [
            "Button",
            "Dialog",
            "DialogClose",
            "DialogContent",
            "DialogDescription",
            "DialogFooter",
            "DialogHeader",
            "DialogTitle",
            "DialogTrigger",
            "Input",
            "Label",
        ],
        props: {
            "Dialog[open]": "boolean | state var. Omit when using internal trigger.",
            "DialogTrigger[asChild]": "true renders the child element as the trigger.",
            "DialogClose[asChild]": "true renders the child element to close the dialog.",
        },
        patterns: {
            "with-trigger": {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label
};

?>`,
                html: `<Dialog>
  <form>
    <DialogTrigger asChild="true">
      <Button variant="outline">Open Dialog</Button>
    </DialogTrigger>

    <DialogContent${contentWidth}>
      <DialogHeader>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>
          Make changes to your profile here. Click save when you're done.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4">
        <div class="grid gap-3">
          <Label for="name-1">Name</Label>
          <Input id="name-1" name="name" value="Pedro Duarte" />
        </div>

        <div class="grid gap-3">
          <Label for="username-1">Username</Label>
          <Input id="username-1" name="username" value="@peduarte" />
        </div>
      </div>

      <DialogFooter>
        <DialogClose asChild="true">
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </DialogContent>
  </form>
</Dialog>`,
                notes: [
                    "Internal trigger via <DialogTrigger asChild>.",
                    "No JS state is required for this pattern.",
                ],
            },
            "controlled-open": {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label
};

?>`,
                html: `<Button variant="outline" onclick="setOpenDialog(true)">Open Dialog</Button>

<Dialog open="openDialog">
  <form>
    <DialogContent${contentWidth}>
      <DialogHeader>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>
          Make changes to your profile here. Click save when you're done.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4">
        <div class="grid gap-3">
          <Label for="name-1">Name</Label>
          <Input id="name-1" name="name" value="Pedro Duarte" />
        </div>

        <div class="grid gap-3">
          <Label for="username-1">Username</Label>
          <Input id="username-1" name="username" value="@peduarte" />
        </div>
      </div>

      <DialogFooter>
        <DialogClose asChild="true">
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </DialogContent>
  </form>
</Dialog>`,
                js: `<script>
  const [openDialog, setOpenDialog] = pphp.state(false);
</script>`,
                notes: [
                    "Controlled pattern: external button opens via state var.",
                    "Close via <DialogClose asChild> or by setting setOpenDialog(false).",
                ],
            },
        },
    };
}
function sheetDoc(_tailwind) {
    return {
        name: "Sheet",
        requires: [
            "Button",
            "Input",
            "Label",
            "Sheet",
            "SheetClose",
            "SheetContent",
            "SheetDescription",
            "SheetFooter",
            "SheetHeader",
            "SheetTitle",
            "SheetTrigger",
        ],
        props: {
            "Sheet[open]": "boolean | state var. Omit when using internal trigger.",
            "Sheet[overlayClass]": 'Tailwind classes applied to the overlay (e.g. "bg-blue-500/70").',
            "Sheet[closeOnOverlayClick]": "boolean, default: true. Set false to disable overlay-click close.",
            "SheetTrigger[asChild]": "true renders the child element as the trigger.",
            "SheetClose[asChild]": "true renders the child element to close the sheet.",
            "SheetContent[side]": 'one of "right" | "left" | "top" | "bottom". Default is "right".',
        },
        patterns: {
            "with-trigger": {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Button,
  Input,
  Label,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
};

?>`,
                html: `<Sheet>
  <SheetTrigger asChild="true">
    <Button variant="outline">Open</Button>
  </SheetTrigger>

  <SheetContent>
    <SheetHeader>
      <SheetTitle>Edit profile</SheetTitle>
      <SheetDescription>
        Make changes to your profile here. Click save when you're done.
      </SheetDescription>
    </SheetHeader>

    <div class="grid flex-1 auto-rows-min gap-6 px-4">
      <div class="grid gap-3">
        <Label for="sheet-demo-name">Name</Label>
        <Input id="sheet-demo-name" value="Pedro Duarte" />
      </div>
      <div class="grid gap-3">
        <Label for="sheet-demo-username">Username</Label>
        <Input id="sheet-demo-username" value="@peduarte" />
      </div>
    </div>

    <SheetFooter>
      <Button type="submit">Save changes</Button>
      <SheetClose asChild="true">
        <Button variant="outline">Close</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>`,
                notes: [
                    "Internal trigger via <SheetTrigger asChild>.",
                    'Overlay styling is set on <Sheet overlayClass="…" />.',
                    "No JS state required in this pattern.",
                    "Default overlay click closes the sheet (closeOnOverlayClick = true).",
                ],
            },
            "controlled-open": {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Button,
  Input,
  Label,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
};

?>`,
                html: `<Button variant="outline" onclick="setOpenSheet(true)">Open</Button>

<Sheet open="openSheet">
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Edit profile</SheetTitle>
      <SheetDescription>
        Make changes to your profile here. Click save when you're done.
      </SheetDescription>
    </SheetHeader>

    <div class="grid flex-1 auto-rows-min gap-6 px-4">
      <div class="grid gap-3">
        <Label for="sheet-demo-name">Name</Label>
        <Input id="sheet-demo-name" value="Pedro Duarte" />
      </div>
      <div class="grid gap-3">
        <Label for="sheet-demo-username">Username</Label>
        <Input id="sheet-demo-username" value="@peduarte" />
      </div>
    </div>

    <SheetFooter>
      <Button type="submit">Save changes</Button>
      <SheetClose asChild="true">
        <Button variant="outline">Close</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>`,
                js: `<script>
  const [openSheet, setOpenSheet] = pphp.state(false);
</script>`,
                notes: [
                    "Controlled pattern: external button opens via state var.",
                    'Set closeOnOverlayClick="false" on <Sheet> to disable overlay click-to-close.',
                    'Change side via <SheetContent side="left|right|top|bottom"> (default: right).',
                ],
            },
        },
    };
}
function buttonDoc(_tailwind) {
    return {
        name: "Button",
        requires: ["Button"],
        props: {
            "Button[variant]": 'one of "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" (default: "default")',
            "Button[size]": 'one of "default" | "sm" | "lg" | "icon" (default: "default")',
            "Button[asChild]": "boolean. When true, renders the child element as the button (e.g., wrap an <a>).",
        },
        patterns: {
            basic: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Button
};

?>`,
                html: `<div class="flex flex-wrap items-center gap-2">
  <Button>Default</Button>
  <Button variant="destructive">Destructive</Button>
  <Button variant="outline">Outline</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="ghost">Ghost</Button>
  <Button variant="link">Link</Button>
</div>`,
                notes: [
                    "Default variant requires no `variant` prop.",
                    'Use variant="outline|secondary|ghost|link|destructive" for other styles.',
                ],
            },
            "as-child": {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Button
};

?>`,
                html: `<Button asChild="true">
  <a href="/docs">Open Docs</a>
</Button>`,
                notes: [
                    'When asChild="true", the child element (e.g., <a>) receives the button styles and behavior.',
                    "Works with other elements too (e.g., <span>, router links, etc.).",
                ],
            },
            // Icon-size button (24x24ish). Inline SVG keeps it self-contained.
            icon: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Button
};

?>`,
                html: `<Button size="icon" aria-label="Add">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
       aria-hidden="true">
    <path d="M12 5v14M5 12h14"></path>
  </svg>
</Button>`,
                notes: [
                    'Use size="icon" for square icon buttons.',
                    "If you installed PPIcons, you can place <Plus /> inside instead of the inline SVG.",
                ],
            },
        },
    };
}
function alertDialogDoc(_tailwind) {
    return {
        name: "AlertDialog",
        requires: [
            "AlertDialog",
            "AlertDialogAction",
            "AlertDialogCancel",
            "AlertDialogContent",
            "AlertDialogDescription",
            "AlertDialogFooter",
            "AlertDialogHeader",
            "AlertDialogTitle",
            "AlertDialogTrigger",
            "Button",
        ],
        props: {
            "AlertDialog[open]": "boolean | state var. Use for controlled pattern.",
            "AlertDialog[overlayClass]": 'Tailwind classes to style the overlay (e.g. "bg-black/60").',
            "AlertDialogTrigger[asChild]": "true renders the child element as the trigger.",
            "AlertDialogAction[variant]": 'one of "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" (default: "default")',
            "AlertDialogAction[size]": 'one of "default" | "sm" | "lg" | "icon" (default: "default")',
            "AlertDialogAction[asChild]": "boolean. When true, renders the child as the action element.",
        },
        patterns: {
            "with-trigger": {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button
};

?>`,
                html: `<AlertDialog>
  <AlertDialogTrigger asChild="true">
    <Button variant="outline">Show Dialog</Button>
  </AlertDialogTrigger>

  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete your
        account and remove your data from our servers.
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`,
                notes: [
                    "Internal trigger via <AlertDialogTrigger asChild>.",
                    'Default action button uses variant="default" implicitly.',
                    "No JS state required in this pattern.",
                ],
            },
            "controlled-open": {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button
};

?>`,
                html: `<Button variant="outline" onclick="setOpenAlert(true)">Show Dialog</Button>

<AlertDialog open="openAlert" overlayClass="bg-black/60">
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete your
        account and remove your data from our servers.
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction variant="destructive">Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`,
                js: `<script>
  const [openAlert, setOpenAlert] = pphp.state(false);
</script>`,
                notes: [
                    "Controlled pattern: external button opens via state var bound to AlertDialog[open].",
                    "Customize overlay with overlayClass on <AlertDialog>.",
                    "Use AlertDialogAction[variant|size|asChild] for styling/behavior.",
                ],
            },
        },
    };
}
function toggleSwitchDoc(_tailwind) {
    return {
        name: "ToggleSwitch",
        requires: ["ToggleSwitch"],
        props: {
            "ToggleSwitch[checked]": 'true | false | string (state var name). When a string is provided (e.g., "isActive"), the switch is two-way bound and updates the state automatically — no extra event listeners required.',
            "ToggleSwitch[asChild]": "boolean. When true, renders the child element as the switch root.",
        },
        patterns: {
            basic: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  ToggleSwitch
};

?>`,
                html: `<ToggleSwitch />`,
                notes: ["Uncontrolled; default is unchecked.", "No JS state required."],
            },
            "default-checked": {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  ToggleSwitch,
  Label
};

?>`,
                html: `<div class="flex items-center gap-2">
  <ToggleSwitch id="user-is-active" checked="true" />
  <Label for="user-is-active">Active</Label>
</div>`,
                notes: [
                    'Use checked="true" to render checked by default (still uncontrolled).',
                    "No JS state required.",
                ],
            },
            controlled: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  ToggleSwitch,
  Label
};

?>`,
                html: `<div class="flex items-center gap-2">
  <ToggleSwitch id="user-is-active" checked="isActive" />
  <Label for="user-is-active">Active</Label>
</div>`,
                js: `<script>
  // Controlled: the component manages events internally and keeps "isActive" in sync.
  // DO NOT add onchange/onclick handlers here.
  const [isActive, setIsActive] = pphp.state(false);
</script>`,
                notes: [
                    'Controlled usage: pass the state var name as a string, e.g., checked="isActive".',
                    "Two-way binding is built-in — do NOT add oninput/onchange/onclick listeners.",
                    "The switch will update the bound state automatically.",
                ],
            },
            "as-child": {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  ToggleSwitch
};

?>`,
                html: `<ToggleSwitch asChild="true">
  <button type="button" class="inline-flex items-center gap-2 px-3 py-2 rounded-md border">
    <span>Notifications</span>
  </button>
</ToggleSwitch>`,
                notes: [
                    'When asChild="true", the child element receives the switch behavior & accessibility.',
                    "This pattern is independent of controlled/uncontrolled.",
                ],
            },
        },
    };
}
function badgeDoc(_tailwind) {
    return {
        name: "Badge",
        requires: ["Badge"],
        props: {
            "Badge[variant]": 'one of "default" | "secondary" | "destructive" | "outline" (default: "default")',
            "Badge[asChild]": "boolean. When true, renders the child element as the badge root.",
        },
        patterns: {
            basic: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Badge
};

?>`,
                html: `<div class="flex flex-wrap items-center gap-2">
  <Badge>Badge</Badge>
  <Badge variant="secondary">Secondary</Badge>
  <Badge variant="destructive">Destructive</Badge>
  <Badge variant="outline">Outline</Badge>
</div>`,
                notes: [
                    'Default look does not require variant="default".',
                    "No JS/state needed.",
                ],
            },
            "as-child": {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Badge
};

?>`,
                html: `<Badge asChild="true">
  <a href="/inbox" class="no-underline">New</a>
</Badge>`,
                notes: [
                    'When asChild="true", the child (e.g., <a>) receives the badge styles/semantics.',
                    "Leave asChild unset for the common case (defaults to false).",
                ],
            },
        },
    };
}
function cardDoc(_tailwind) {
    return {
        name: "Card",
        requires: [
            "Card",
            "CardHeader",
            "CardTitle",
            "CardDescription",
            "CardAction",
            "CardContent",
            "CardFooter",
            "Button",
            "Input",
            "Label",
        ],
        props: {
            "Card[class]": "Tailwind classes to size/layout the card container.",
            "CardHeader[class]": "Optional Tailwind utility classes.",
            "CardContent[class]": "Optional Tailwind utility classes.",
            "CardFooter[class]": "Optional Tailwind utility classes.",
            "CardAction[class]": "Optional Tailwind utility classes (actions in header).",
        },
        patterns: {
            basic: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label
};

?>`,
                html: `<Card class="w-full max-w-sm">
  <CardHeader>
    <CardTitle>Login to your account</CardTitle>
    <CardDescription>
      Enter your email below to login to your account
    </CardDescription>
    <CardAction>
      <Button variant="link">Sign Up</Button>
    </CardAction>
  </CardHeader>

  <CardContent>
    <form>
      <div class="flex flex-col gap-6">
        <div class="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required="true" />
        </div>

        <div class="grid gap-2">
          <div class="flex items-center">
            <Label htmlFor="password">Password</Label>
            <a href="#" class="ml-auto inline-block text-sm underline-offset-4 hover:underline">
              Forgot your password?
            </a>
          </div>
          <Input id="password" type="password" required="true" />
        </div>
      </div>
    </form>
  </CardContent>

  <CardFooter class="flex-col gap-2">
    <Button type="submit" class="w-full">
      Login
    </Button>
    <Button variant="outline" class="w-full">
      Login with Google
    </Button>
  </CardFooter>
</Card>`,
                notes: [
                    "Card is a purely visual container; no JS/state required.",
                    "Use CardAction inside CardHeader for header-level actions (e.g., links/buttons).",
                    "Compose any content inside CardContent (forms, lists, media, etc.).",
                    "Size/layout the card with Tailwind classes on the root <Card> (e.g., w-full max-w-sm).",
                ],
            },
        },
    };
}
function inputDoc(_tailwind) {
    return {
        name: "Input",
        requires: ["Input"],
        props: {
            "Input[type]": 'standard HTML types: "text" | "email" | "password" | "search" | "number" | "tel" | "url" | "date" | "time" etc. (default: "text")',
            "Input[placeholder]": "string placeholder text.",
            "Input[value]": "string (static). For reactive control, pair with pp-bind-value + oninput.",
            "Input[id]": "string id attribute.",
            "Input[name]": "string name attribute.",
            "Input[required]": 'boolean (e.g., required="true").',
            "Input[disabled]": "boolean.",
            "Input[readonly]": "boolean.",
            "Input[min|max|step]": "number inputs.",
            "Input[minLength|maxLength]": "text length limits.",
            "Input[pattern]": "regex pattern for validation.",
            "Input[autocomplete]": "string (e.g., 'email', 'name').",
            "Input[class]": "Tailwind classes to adjust spacing/size.",
            "Input[aria-invalid]": "boolean for error styling/accessibility.",
        },
        patterns: {
            basic: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Input
};

?>`,
                html: `<Input type="email" placeholder="Email" />`,
                notes: [
                    "Purely visual wrapper around a native <input>.",
                    "No internal state or events—treat it like a normal input element.",
                ],
            },
            // Label + Input pairing (common form row)
            "as-child": {
                // (re-using the enum slot to showcase a labeled input pattern)
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Input,
  Label
};

?>`,
                html: `<div class="grid gap-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="m@example.com" required="true" />
</div>`,
                notes: [
                    "Use Label[htmlFor] matching Input[id] for accessibility.",
                    'Boolean attributes are written as strings (e.g., required="true").',
                ],
            },
            // Input with leading icon (visual only)
            icon: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Input
};

?>`,
                html: `<div class="relative">
  <svg
    class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
    width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M4 4h16v16H4z"></path>
    <path d="M22 6l-10 7L2 6"></path>
  </svg>
  <Input class="pl-9" type="email" placeholder="you@example.com" />
</div>`,
                notes: [
                    "Add padding-left on the Input and absolutely position the icon.",
                    "Inline SVG keeps the pattern self-contained (or place an icon component).",
                ],
            },
            controlled: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Input,
  Label
};

?>`,
                html: `<div class="grid gap-2">
  <Label htmlFor="email-ctrl">Email</Label>
  <Input id="email-ctrl" type="email" pp-bind-value="email" oninput="setEmail(this.value)" placeholder="m@example.com" />
</div>`,
                js: `<script>
  // Visual-only component: use PPHP state for control.
  const [email, setEmail] = pphp.state("");
</script>`,
                notes: [
                    "Input is visual-only; it does not implement two-way binding by itself.",
                    'Use pp-bind-value + oninput="setX(this.value)" to control the value with PPHP state.',
                ],
            },
        },
    };
}
function labelDoc(_tailwind) {
    return {
        name: "Label",
        requires: ["Label"],
        props: {
            "Label[for]": "string. The id of the control this label describes.",
            "Label[htmlFor]": "alias of `for` (use either).",
            "Label[class]": "Tailwind classes for spacing/size/weight.",
        },
        patterns: {
            basic: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Label,
  Input
};

?>`,
                html: `<div class="grid gap-2">
  <Label for="email">Email</Label>
  <Input id="email" type="email" placeholder="m@example.com" />
</div>

<div class="flex items-center gap-2 mt-4">
  <input id="terms" type="checkbox" />
  <Label for="terms">Accept terms and conditions</Label>
</div>`,
                notes: [
                    "Associate the label with a control by matching Label[for] (or htmlFor) to the control's id.",
                    "Purely visual—no internal state. Clicks on the label focus/toggle the target control (native browser behavior).",
                ],
            },
        },
    };
}
function tableDoc(_tailwind) {
    return {
        name: "Table",
        requires: [
            "Table",
            "TableBody",
            "TableCaption",
            "TableCell",
            "TableFooter",
            "TableHead",
            "TableHeader",
            "TableRow",
        ],
        props: {
            "Table[class]": "Tailwind classes on the table element.",
            "TableHead[class]": "Utility classes for header cells.",
            "TableCell[class]": "Utility classes for body/footer cells.",
            "TableRow[class]": "Utility classes per row.",
            "TableCaption[class]": "Utility classes for caption.",
            "TableCell[colspan]": 'Number of columns to span (e.g., colspan="3").',
        },
        patterns: {
            basic: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
};

?>`,
                html: `<Table>
  <TableCaption>A list of your recent invoices.</TableCaption>

  <TableHeader>
    <TableRow>
      <TableHead class="w-[100px]">Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Method</TableHead>
      <TableHead class="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>

  <TableBody>
    <template pp-for="(invoice, idx) in invoices">
      <TableRow>
        <TableCell class="font-medium">{{ invoice.invoice }}</TableCell>
        <TableCell>{{ invoice.paymentStatus }}</TableCell>
        <TableCell>{{ invoice.paymentMethod }}</TableCell>
        <TableCell class="text-right">{{ invoice.totalAmount }}</TableCell>
      </TableRow>
    </template>
  </TableBody>

  <TableFooter>
    <TableRow>
      <TableCell colspan="3">Total</TableCell>
      <TableCell class="text-right">$2,500.00</TableCell>
    </TableRow>
  </TableFooter>
</Table>`,
                js: `<script>
  // Visual-only: rows render from reactive data. Arrays/objects are reactive directly.
  const invoices = pphp.state([
    { invoice: 'INV001', paymentStatus: 'Paid',    totalAmount: '$250.00', paymentMethod: 'Credit Card' },
    { invoice: 'INV002', paymentStatus: 'Pending', totalAmount: '$150.00', paymentMethod: 'PayPal' },
    { invoice: 'INV003', paymentStatus: 'Unpaid',  totalAmount: '$350.00', paymentMethod: 'Bank Transfer' },
    { invoice: 'INV004', paymentStatus: 'Paid',    totalAmount: '$450.00', paymentMethod: 'Credit Card' },
    { invoice: 'INV005', paymentStatus: 'Paid',    totalAmount: '$550.00', paymentMethod: 'PayPal' },
    { invoice: 'INV006', paymentStatus: 'Pending', totalAmount: '$200.00', paymentMethod: 'Bank Transfer' },
    { invoice: 'INV007', paymentStatus: 'Unpaid',  totalAmount: '$300.00', paymentMethod: 'Credit Card' }
  ]);

  // Example updates (optional):
  // invoices.push({ invoice: 'INV008', paymentStatus: 'Paid', totalAmount: '$125.00', paymentMethod: 'PayPal' });
  // invoices[1].paymentStatus = 'Paid';
</script>`,
                notes: [
                    "Purely presentational; no internal sorting, pagination, or selection.",
                    "Render rows with pp-for. Arrays/objects are reactive directly (no .value).",
                    "Use Tailwind utilities on subcomponents (e.g., .text-right, width classes).",
                    "Use <TableFooter> for summaries; set colspan via TableCell[colspan].",
                ],
            },
        },
    };
}
function textareaDoc(_tailwind) {
    return {
        name: "Textarea",
        requires: ["Textarea"],
        props: {
            "Textarea[placeholder]": "string placeholder text.",
            "Textarea[rows]": 'number of visible lines (e.g., rows="4").',
            "Textarea[id]": "string id attribute.",
            "Textarea[name]": "string name attribute.",
            "Textarea[value]": "string (static). For reactive control, pair with pp-bind-value + oninput.",
            "Textarea[required]": 'boolean (e.g., required="true").',
            "Textarea[disabled]": "boolean.",
            "Textarea[readonly]": "boolean.",
            "Textarea[minLength|maxLength]": "text length limits.",
            "Textarea[aria-invalid]": "boolean for error styling/accessibility.",
            "Textarea[class]": "Tailwind utilities (e.g., min-h-24, resize-none, resize-y, field-sizing-content).",
        },
        patterns: {
            basic: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Textarea
};

?>`,
                html: `<Textarea placeholder="Type your message here." />`,
                notes: [
                    "Purely visual wrapper around a native <textarea>.",
                    "Use Tailwind utilities to control height/resize (e.g., min-h-24, resize-y).",
                ],
            },
            // Label + Textarea pairing (common form row)
            "as-child": {
                // (re-using the enum slot to showcase a labeled textarea pattern)
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Textarea,
  Label
};

?>`,
                html: `<div class="grid gap-2">
  <Label htmlFor="message">Message</Label>
  <Textarea id="message" placeholder="Tell us a bit about yourself" class="min-h-24 resize-y" />
</div>`,
                notes: [
                    "Match Label[htmlFor] (or for) to Textarea[id] for accessibility.",
                    "Use resize-y (or resize-none) and min-h-* to control sizing/behavior.",
                ],
            },
            // Controlled example using PPHP reactive state (framework-level, not Textarea-level)
            controlled: {
                phpUse: `<?php

use Lib\\PHPXUI\\{
  Textarea,
  Label
};

?>`,
                html: `<div class="grid gap-2">
  <Label htmlFor="bio">Bio</Label>
  <Textarea
    id="bio"
    pp-bind-value="bio"
    oninput="setBio(this.value)"
    placeholder="Short bio…"
    class="field-sizing-content min-h-24"
  />
  <span class="text-xs text-muted-foreground">{{ bio.length }}/300</span>
</div>`,
                js: `<script>
  // Visual-only component: use PPHP state for control (primitive string).
  const [bio, setBio] = pphp.state("");
</script>`,
                notes: [
                    "Textarea is visual-only; it does not implement two-way binding by itself.",
                    'Use pp-bind-value + oninput="setX(this.value)" with a primitive string state.',
                    "For natural growth without JS, use field-sizing-content (if enabled) with a sensible min-h-*.",
                ],
            },
        },
    };
}
export function getPhpXuiUsageDoc(nameRaw, tailwind) {
    const name = (nameRaw || "").trim().toLowerCase();
    if (name === "dialog")
        return dialogDoc(tailwind);
    if (name === "sheet")
        return sheetDoc(tailwind);
    if (name === "button")
        return buttonDoc(tailwind);
    if (name === "alertdialog")
        return alertDialogDoc(tailwind);
    if (name === "toggleswitch")
        return toggleSwitchDoc(tailwind);
    if (name === "badge")
        return badgeDoc(tailwind);
    if (name === "card")
        return cardDoc(tailwind);
    if (name === "input")
        return inputDoc(tailwind);
    if (name === "label")
        return labelDoc(tailwind);
    if (name === "table")
        return tableDoc(tailwind);
    if (name === "textarea")
        return textareaDoc(tailwind);
    // Add more components here as you grow the catalog...
    return null;
}
//# sourceMappingURL=phpxui-usage.js.map