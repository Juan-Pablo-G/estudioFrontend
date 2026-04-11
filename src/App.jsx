import { useEffect, useMemo, useState } from 'react'

const API_BASE= 'https://estudiobackend.onrender.com'

//const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [authMode, setAuthMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [posts, setPosts] = useState([])
  const [publicPosts, setPublicPosts] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [publishPublic, setPublishPublic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [publicError, setPublicError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [editingPostId, setEditingPostId] = useState(null)
  const [editingImageUrl, setEditingImageUrl] = useState('')

  const api = useMemo(() => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return {
      postsUrl: `${API_BASE}/api/posts`,
      publicPostsUrl: `${API_BASE}/api/posts/public`,
      authUrl: `${API_BASE}/api/auth`,
      headers,
    }
  }, [token])

  const getImageSrc = (imageUrl) =>
    imageUrl?.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`

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

  const fetchPublicPosts = async () => {
    try {
      setPublicError('')
      const res = await fetch(api.publicPostsUrl)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'No se pudo cargar el feed público')
      }
      const data = await res.json()
      setPublicPosts(data)
    } catch (err) {
      console.error(err)
      setPublicError(err.message || 'No se pudo cargar el feed público')
    }
  }

  useEffect(() => {
    fetchPublicPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.publicPostsUrl])

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
      if (editingPostId === id) {
        handleCancelEdit()
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al eliminar la publicación')
    } finally {
      setDeletingId(null)
    }
  }

  const handleStartEditing = (post) => {
    setEditingPostId(post._id)
    setTitle(post.title)
    setDescription(post.description || '')
    setPublishPublic(post.isPublic)
    setImageFile(null)
    setEditingImageUrl(post.imageUrl)
    setError('')
  }

  const handleCancelEdit = () => {
    setEditingPostId(null)
    setEditingImageUrl('')
    setTitle('')
    setDescription('')
    setImageFile(null)
    setPublishPublic(false)
    setError('')
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError('')

    if (!editingPostId) {
      return
    }
    if (!title) {
      setError('El título es obligatorio')
      return
    }
    if (!token) {
      setError('Debes iniciar sesión para editar')
      return
    }

    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('isPublic', publishPublic ? 'true' : 'false')
    if (imageFile) {
      formData.append('image', imageFile)
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`${api.postsUrl}/${editingPostId}`, {
        method: 'PATCH',
        body: formData,
        headers: api.headers,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Error al actualizar la publicación')
      }

      const updatedPost = await res.json()
      setPosts((prev) => prev.map((post) => (post._id === updatedPost._id ? updatedPost : post)))
      await fetchPublicPosts()
      handleCancelEdit()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al actualizar la publicación')
    } finally {
      setIsSubmitting(false)
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
    formData.append('isPublic', publishPublic ? 'true' : 'false')

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
      await fetchPublicPosts()
      setTitle('')
      setDescription('')
      setImageFile(null)
      setPublishPublic(false)
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
    setPublishPublic(false)
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
          <h2>{editingPostId ? 'Editar publicación' : 'Nueva publicación'}</h2>
          <form onSubmit={editingPostId ? handleUpdate : handleSubmit} className="post-form">
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
              <label htmlFor="image">
                Imagen {editingPostId ? '(opcional, selecciona un archivo solo si deseas cambiarla)' : '*'}
              </label>
              <input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0] || null)}
              />
              {editingPostId && editingImageUrl && !imageFile ? (
                <p className="info-text">
                  Imagen actual conservada. Selecciona un nuevo archivo solo si quieres reemplazarla.
                </p>
              ) : null}
            </div>

            <div
              className="form-group"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <input
                id="isPublic"
                name="isPublic"
                type="checkbox"
                checked={publishPublic}
                onChange={(e) => setPublishPublic(e.target.checked)}
              />
              <label htmlFor="isPublic" style={{ margin: 0 }}>
                Publicar para el público
              </label>
            </div>

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (editingPostId ? 'Actualizando...' : 'Subiendo...') : editingPostId ? 'Actualizar' : 'Publicar'}
              </button>
              {editingPostId ? (
                <button type="button" onClick={handleCancelEdit} className="secondary-button">
                  Cancelar edición
                </button>
              ) : null}
            </div>
          </form>
        </section>
        )}

        <section className="gallery-section">
          <h2>Feed público</h2>
          {publicError ? (
            <p className="error-text">{publicError}</p>
          ) : publicPosts.length === 0 ? (
            <p className="empty-text">Todavía no hay publicaciones públicas.</p>
          ) : (
            <div className="masonry">
              {publicPosts.map((post) => (
                <article
                  key={`${post._id || 'noid'}-${post.imageUrl || 'noimg'}`}
                  className="masonry-item"
                >
                  <div className="card">
                    <img
                      src={getImageSrc(post.imageUrl)}
                      alt={post.title}
                      loading="lazy"
                    />
                    <div className="card-body">
                      <h3>{post.title}</h3>
                      {post.description && <p>{post.description}</p>}
                      <small style={{ display: 'block', opacity: 0.8 }}>Público</small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

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
                      className="edit-button"
                      onClick={() => handleStartEditing(post)}
                      aria-label="Editar publicación"
                    >
                      ✎
                    </button>
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
                      src={getImageSrc(post.imageUrl)}
                      alt={post.title}
                      loading="lazy"
                    />
                    <div className="card-body">
                      <h3>{post.title}</h3>
                      {post.description && <p>{post.description}</p>}
                      <small style={{ display: 'block', opacity: 0.8 }}>
                        {post.isPublic ? 'Público' : 'Privado'}
                      </small>
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
