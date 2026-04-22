import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = 'https://estudiobackend.onrender.com'

// const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function AppModal() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [authMode, setAuthMode] = useState('login')
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
  const [editingPost, setEditingPost] = useState(null)

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
        throw new Error(body.message || 'No se pudo cargar el feed publico')
      }

      const data = await res.json()
      setPublicPosts(data)
    } catch (err) {
      console.error(err)
      setPublicError(err.message || 'No se pudo cargar el feed publico')
    }
  }

  useEffect(() => {
    fetchPublicPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.publicPostsUrl])

  const handleDelete = async (id) => {
    const confirmar = window.confirm('Seguro que quieres eliminar esta publicacion?')
    if (!confirmar) return

    try {
      setDeletingId(id)
      const res = await fetch(`${api.postsUrl}/${id}`, {
        method: 'DELETE',
        headers: api.headers,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Error al eliminar la publicacion')
      }

      setPosts((prev) => prev.filter((post) => post._id !== id))
      if (editingPost?._id === id) {
        handleCancelEdit()
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al eliminar la publicacion')
    } finally {
      setDeletingId(null)
    }
  }

  const handleStartEditing = (post) => {
    setEditingPost({
      _id: post._id,
      title: post.title,
      description: post.description || '',
      isPublic: post.isPublic,
      imageUrl: post.imageUrl,
      imageFile: null,
    })
    setError('')
  }

  const handleCancelEdit = () => {
    setEditingPost(null)
    setError('')
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError('')

    if (!editingPost) return

    if (!editingPost.title) {
      setError('El titulo es obligatorio')
      return
    }

    if (!token) {
      setError('Debes iniciar sesion para editar')
      return
    }

    const formData = new FormData()
    formData.append('title', editingPost.title)
    formData.append('description', editingPost.description)
    formData.append('isPublic', editingPost.isPublic ? 'true' : 'false')
    if (editingPost.imageFile) {
      formData.append('image', editingPost.imageFile)
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`${api.postsUrl}/${editingPost._id}`, {
        method: 'PATCH',
        body: formData,
        headers: api.headers,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Error al actualizar la publicacion')
      }

      const updatedPost = await res.json()
      setPosts((prev) => prev.map((post) => (post._id === updatedPost._id ? updatedPost : post)))
      await fetchPublicPosts()
      handleCancelEdit()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al actualizar la publicacion')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title || !imageFile) {
      setError('El titulo y la imagen son obligatorios')
      return
    }

    if (!token) {
      setError('Debes iniciar sesion para publicar')
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
        throw new Error(body.message || 'Error al crear la publicacion')
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
      setError(err.message || 'Error al crear la publicacion')
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
      if (!res.ok) throw new Error(body.message || 'Error de autenticacion')

      localStorage.setItem('token', body.token)
      setToken(body.token)
      setPassword('')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error de autenticacion')
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
        <p>Sube tus imagenes con titulo y descripcion.</p>
        <div className="header-actions">
          <small><strong>API</strong>: {API_BASE}</small>
          {token ? (
            <button type="button" onClick={handleLogout}>Cerrar sesion</button>
          ) : null}
        </div>
      </header>

      <main className="app-main">
        {!token ? (
          <section className="form-section">
            <h2>{authMode === 'register' ? 'Crear cuenta' : 'Iniciar sesion'}</h2>
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
                <label htmlFor="password">Contrasena *</label>
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
              <div className="form-actions">
                <button type="submit">
                  {authMode === 'register' ? 'Registrarme' : 'Entrar'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setError('')
                    setAuthMode((mode) => (mode === 'login' ? 'register' : 'login'))
                  }}
                >
                  {authMode === 'register' ? 'Ya tengo cuenta' : 'Quiero registrarme'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="form-section">
            <h2>Nueva publicacion</h2>
            <form onSubmit={handleSubmit} className="post-form">
              <div className="form-group">
                <label htmlFor="title">Titulo *</label>
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
                <label htmlFor="description">Descripcion</label>
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

              <div className="form-group checkbox-row">
                <input
                  id="isPublic"
                  name="isPublic"
                  type="checkbox"
                  checked={publishPublic}
                  onChange={(e) => setPublishPublic(e.target.checked)}
                />
                <label htmlFor="isPublic" style={{ margin: 0 }}>
                  Publicar para el publico
                </label>
              </div>

              {error && <p className="error-text">{error}</p>}

              <div className="form-actions">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Subiendo...' : 'Publicar'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="gallery-section">
          <h2>Feed publico</h2>
          {publicError ? (
            <p className="error-text">{publicError}</p>
          ) : publicPosts.length === 0 ? (
            <p className="empty-text">Todavia no hay publicaciones publicas.</p>
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
                      <small style={{ display: 'block', opacity: 0.8 }}>Publico</small>
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
                ? 'No tienes publicaciones todavia.'
                : 'Inicia sesion para ver tus publicaciones.'}
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
                      aria-label="Editar publicacion"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleDelete(post._id)}
                      disabled={deletingId === post._id}
                      aria-label="Eliminar publicacion"
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
                        {post.isPublic ? 'Publico' : 'Privado'}
                      </small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {editingPost ? (
        <div className="modal-backdrop" role="presentation" onClick={handleCancelEdit}>
          <section
            className="edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-post-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="edit-modal-header">
              <div>
                <p className="modal-eyebrow">Editar publicacion</p>
                <h2 id="edit-post-title">Actualiza tu foto y sus detalles</h2>
              </div>
              <button
                type="button"
                className="modal-close-button"
                onClick={handleCancelEdit}
                aria-label="Cerrar editor"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdate} className="post-form edit-modal-form">
              <div className="edit-modal-preview">
                <img
                  src={getImageSrc(editingPost.imageUrl)}
                  alt={editingPost.title}
                  loading="lazy"
                />
                <p>
                  {editingPost.imageFile
                    ? `Nueva imagen seleccionada: ${editingPost.imageFile.name}`
                    : 'Puedes conservar la imagen actual o reemplazarla por otra.'}
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="edit-title">Titulo *</label>
                <input
                  id="edit-title"
                  name="edit-title"
                  type="text"
                  placeholder="Ej: Atardecer en la playa"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">Descripcion</label>
                <textarea
                  id="edit-description"
                  name="edit-description"
                  placeholder="Cuenta algo sobre esta imagen..."
                  rows={3}
                  value={editingPost.description}
                  onChange={(e) =>
                    setEditingPost((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-image">Reemplazar imagen (opcional)</label>
                <input
                  id="edit-image"
                  name="edit-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setEditingPost((prev) => ({ ...prev, imageFile: e.target.files[0] || null }))
                  }
                />
              </div>

              <div className="form-group checkbox-row">
                <input
                  id="edit-isPublic"
                  name="edit-isPublic"
                  type="checkbox"
                  checked={editingPost.isPublic}
                  onChange={(e) =>
                    setEditingPost((prev) => ({ ...prev, isPublic: e.target.checked }))
                  }
                />
                <label htmlFor="edit-isPublic" style={{ margin: 0 }}>
                  Mostrar esta publicacion al publico
                </label>
              </div>

              {error && <p className="error-text">{error}</p>}

              <div className="form-actions">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Actualizando...' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default AppModal
