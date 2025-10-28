import { useNavigate } from 'react-router-dom';

const NotFoundScreen = () => {
  const navigate = useNavigate();
  return (
    <section className="page-section" style={{ gap: 18 }}>
      <div className="error-banner">Trang bạn tìm không tồn tại.</div>
      <button className="primary-button" type="button" onClick={() => navigate('/')}>
        Về trang chủ
      </button>
    </section>
  );
};

export default NotFoundScreen;
