import { useEffect, useMemo, useState } from 'react'

const API_BASE= 'https://estudiobackend.onrender.com/api/posts'

//const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [authMode, setAuthMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const api = useMemo(() => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return {
      postsUrl: `${API_BASE}/api/posts`,
      authUrl: `${API_BASE}/api/auth`,
      headers,
    }
  }, [token])

  const fetchPosts = async () => {
    try {
      if (!token) {
        setPosts([])
        return
      }
      const res = await fetch(api.postsUrl, { headers: api.headers })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'No se pudieron cargar las publicaciones')
      }
      const data = await res.json()
      setPosts(data)
    } catch (err) {
      console.error(err)
      setError(err.message || 'No se pudieron cargar las publicaciones')
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id) => {
    const confirmar = window.confirm(
      '¿Seguro que quieres eliminar esta publicación?',
    )
    if (!confirmar) return

    try {
      setDeletingId(id)
      const res = await fetch(`${api.postsUrl}/${id}`, {
        method: 'DELETE',
        headers: api.headers,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Error al eliminar la publicación')
      }

      setPosts((prev) => prev.filter((post) => post._id !== id))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al eliminar la publicación')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title || !imageFile) {
      setError('El título y la imagen son obligatorios')
      return
    }
    if (!token) {
      setError('Debes iniciar sesión para publicar')
      return
    }

    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('image', imageFile)

    try {
      setIsSubmitting(true)

      const res = await fetch(api.postsUrl, {
        method: 'POST',
        body: formData,
        headers: api.headers,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Error al crear la publicación')
      }

      await res.json()
      await fetchPosts()
      setTitle('')
      setDescription('')
      setImageFile(null)
      e.target.reset()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const endpoint = authMode === 'register' ? 'register' : 'login'
      const res = await fetch(`${api.authUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || 'Error de autenticación')

      localStorage.setItem('token', body.token)
      setToken(body.token)
      setPassword('')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error de autenticación')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken('')
    setPosts([])
    setTitle('')
    setDescription('')
    setImageFile(null)
    setError('')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Juan Estudio</h1>
        <p>Sube tus imágenes con título y descripción.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <small><strong>API</strong>: {API_BASE}</small>
          {token ? (
            <button type="button" onClick={handleLogout}>Cerrar sesión</button>
          ) : null}
        </div>
      </header>

      <main className="app-main">
        {!token ? (
          <section className="form-section">
            <h2>{authMode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
            <form onSubmit={handleAuth} className="post-form">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Contraseña *</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <button type="submit">
                {authMode === 'register' ? 'Registrarme' : 'Entrar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setAuthMode((m) => (m === 'login' ? 'register' : 'login'))
                }}
              >
                {authMode === 'register'
                  ? 'Ya tengo cuenta'
                  : 'Quiero registrarme'}
              </button>
            </form>
          </section>
        ) : (
        <section className="form-section">
          <h2>Nueva publicación</h2>
          <form onSubmit={handleSubmit} className="post-form">
            <div className="form-group">
              <label htmlFor="title">Título *</label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="Ej: Atardecer en la playa"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descripción</label>
              <textarea
                id="description"
                name="description"
                placeholder="Cuenta algo sobre esta imagen..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="image">Imagen *</label>
              <input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0] || null)}
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Subiendo...' : 'Publicar'}
            </button>
          </form>
        </section>
        )}

        <section className="gallery-section">
          <h2>Mis publicaciones</h2>
          {posts.length === 0 ? (
            <p className="empty-text">
              {token
                ? 'No tienes publicaciones todavía.'
                : 'Inicia sesión para ver tus publicaciones.'}
            </p>
          ) : (
            <div className="masonry">
              {posts.map((post) => (
                <article
                  key={`${post._id || 'noid'}-${post.imageUrl || 'noimg'}`}
                  className="masonry-item"
                >
                  <div className="card">
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleDelete(post._id)}
                      disabled={deletingId === post._id}
                      aria-label="Eliminar publicación"
                    >
                      {deletingId === post._id ? '...' : '×'}
                    </button>
                    <img
                      src={`${API_BASE}${post.imageUrl}`}
                      alt={post.title}
                      loading="lazy"
                    />
                    <div className="card-body">
                      <h3>{post.title}</h3>
                      {post.description && <p>{post.description}</p>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
