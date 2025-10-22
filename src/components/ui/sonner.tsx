import { Toaster as Sonner, toast } from "sonner"
// Icons are handled by the toast library automatically

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        duration: 3000,
        classNames: {
          toast: "group toast group-[.toaster]:shadow-lg max-w-[320px] min-h-0 p-3 rounded-xl font-medium", // ลดจาก 400px เป็น 320px และ padding จาก p-4 เป็น p-3
          description: "text-sm leading-relaxed max-w-[280px] text-white", // ลดจาก text-base เป็น text-sm และ max-width จาก 360px เป็น 280px
          actionButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white hover:bg-white/30",
          cancelButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white hover:bg-white/30",
          success: "bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600",
          error: "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600", 
          info: "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600",
          warning: "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-600",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
