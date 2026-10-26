export default function AdminNotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-accent-primary">
        404
      </p>

      <h1 className="mt-4 text-xl font-semibold text-text-primary">
        Không tìm thấy trang
      </h1>

      <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
        Trang bạn đang tìm kiếm chưa tồn tại hoặc đường dẫn không chính xác.
      </p>

      <a
        href="/dashboard"
        className="mt-6 inline-flex min-h-10 items-center justify-center rounded-btn bg-accent-primary px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
      >
        Về Dashboard
      </a>
    </div>
  );
}