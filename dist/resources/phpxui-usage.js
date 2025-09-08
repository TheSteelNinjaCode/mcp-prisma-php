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
    // Add more components here as you grow the catalog...
    return null;
}
//# sourceMappingURL=phpxui-usage.js.map