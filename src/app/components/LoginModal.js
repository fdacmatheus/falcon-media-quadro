'use client';

const LoginModal = ({ onSubmit, isOpen }) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onSubmit({
      name: formData.get('name'),
      email: formData.get('email')
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2E2E2E] p-6 rounded-lg w-full max-w-md">
        <h2 className="text-white text-2xl font-bold mb-4">Welcome to falconmedia</h2>
        <p className="text-gray-300 mb-6">Please enter your information to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-white mb-2">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-4 py-2 bg-[#3F3F3F] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D00102]"
              placeholder="Your name"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-white mb-2">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-4 py-2 bg-[#3F3F3F] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D00102]"
              placeholder="your@email.com"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#D00102] text-white py-2 rounded-lg hover:bg-[#D00102]/90 transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal; 