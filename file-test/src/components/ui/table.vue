<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  class: {
    type: String,
    default: ''
  }
})

const classes = computed(() => {
  return cn('w-full caption-bottom text-sm', props.class)
})
</script>

<template>
  <div class="relative w-full overflow-auto">
    <table :class="classes">
      <slot />
    </table>
  </div>
</template>

<script>
export const TableHeader = {
  template: `
    <thead class="[&_tr]:border-b">
      <slot></slot>
    </thead>
  `
}

export const TableBody = {
  template: `
    <tbody class="[&_tr:last-child]:border-0">
      <slot></slot>
    </tbody>
  `
}

export const TableFooter = {
  template: `
    <tfoot class="border-t bg-muted/50 font-medium [&>tr]:last:border-b-0">
      <slot></slot>
    </tfoot>
  `
}

export const TableRow = {
  template: `
    <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
      <slot></slot>
    </tr>
  `
}

export const TableHead = {
  template: `
    <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
      <slot></slot>
    </th>
  `
}

export const TableCell = {
  template: `
    <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0">
      <slot></slot>
    </td>
  `
}

export const TableCaption = {
  template: `
    <caption class="mt-4 text-sm text-muted-foreground">
      <slot></slot>
    </caption>
  `
}
</script>
