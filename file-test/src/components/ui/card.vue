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
  return cn('rounded-lg border bg-card text-card-foreground shadow-sm', props.class)
})
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>

<script>
export const CardHeader = {
  template: `
    <div class="flex flex-col space-y-1.5 p-6">
      <slot></slot>
    </div>
  `
}

export const CardTitle = {
  template: `
    <h3 class="text-2xl font-semibold leading-none tracking-tight">
      <slot></slot>
    </h3>
  `
}

export const CardDescription = {
  template: `
    <p class="text-sm text-muted-foreground">
      <slot></slot>
    </p>
  `
}

export const CardContent = {
  template: `
    <div class="p-6 pt-0">
      <slot></slot>
    </div>
  `
}

export const CardFooter = {
  template: `
    <div class="flex items-center p-6 pt-0">
      <slot></slot>
    </div>
  `
}
</script>
