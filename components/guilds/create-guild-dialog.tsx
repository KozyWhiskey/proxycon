'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Shield, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'; // Assuming you have a Form component wrapper, if not I'll use standard form
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createGuild } from '@/app/guilds/actions';

const formSchema = z.object({
  name: z.string().min(3, 'Guild name must be at least 3 characters').max(50),
  slug: z
    .string()
    .min(3, 'Handle must be at least 3 characters')
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Handle can only contain letters, numbers, and underscores'),
  themeColor: z.string(),
});

export function CreateGuildDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      themeColor: 'gold',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const result = await createGuild(values.name, values.slug, values.themeColor);

      if (!result.success) {
        toast.error(result.message || 'Failed to create guild');
        return;
      }

      toast.success('Guild created successfully!');
      setOpen(false);
      form.reset();
      
      if (result.slug) {
        router.push(`/guilds/${result.slug}`);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    }
  }

  // Auto-generate slug from name if slug is empty
  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const currentSlug = form.getValues('slug');
    if (name && !currentSlug) {
      const suggestedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_') // Replace non-alphanumeric with underscore
        .replace(/_+/g, '_') // Collapse multiple underscores
        .slice(0, 20);
      form.setValue('slug', suggestedSlug, { shouldValidate: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] glass-panel border-white/10">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-wide flex items-center gap-2 text-primary">
            <Shield className="w-5 h-5" />
            Establish a Guild
          </DialogTitle>
          <DialogDescription>
            Create a permanent home for your playgroup. Track stats across multiple events.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guild Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Ravnica High Rollers" 
                      {...field} 
                      onBlur={(e) => {
                        field.onBlur();
                        handleNameBlur(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handle (Short Code)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">@</span>
                      <Input className="pl-7" placeholder="fnc" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Unique URL identifier (upkeep.gg/g/<b>{field.value || 'handle'}</b>)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="themeColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme Color</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a theme" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gold">Burnished Gold (Default)</SelectItem>
                      <SelectItem value="blue">Azorius Blue</SelectItem>
                      <SelectItem value="red">Rakdos Red</SelectItem>
                      <SelectItem value="green">Simic Green</SelectItem>
                      <SelectItem value="black">Orzhov Black</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isSubmitting} className="w-full font-heading">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Forging...
                  </>
                ) : (
                  'Create Guild'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
