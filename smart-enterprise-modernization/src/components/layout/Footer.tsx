export default function Footer() {
  return (
    <footer className="bg-white border-t mt-12">
      <div className="container mx-auto px-4 py-4 text-sm text-gray-500 text-center">
        © {new Date().getFullYear()} Smart Enterprise Modernization — Open
        Source
      </div>
    </footer>
  );
}
