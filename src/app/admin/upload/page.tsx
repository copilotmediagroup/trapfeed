import Link from 'next/link';import UploadForm from './UploadForm';
export default function UploadPage(){return <main className="admin-sub"><div className="admin-top"><div><p>NEW CONTENT</p><h1>Upload Video</h1></div><Link className="secondary" href="/admin/videos">VIDEO LIBRARY</Link></div><UploadForm/></main>}
