import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:4000/api/posts'

function App() {
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const fetchPosts = async () => {
    try {
      const res = await fetch(API_URL)
      const data = await res.json()
      setPosts(data)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar las publicaciones')
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handleDelete = async (id) => {
    const confirmar = window.confirm(
      '¿Seguro que quieres eliminar esta publicación?',
    )
    if (!confirmar) return

    try {
      setDeletingId(id)
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
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

    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('image', imageFile)

    try {
      setIsSubmitting(true)

      const res = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Error al crear la publicación')
      }

      const newPost = await res.json()
      setPosts((prev) => [newPost, ...prev])
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Juan Estudio</h1>
        <p>Sube tus imágenes con título y descripción.</p>
      </header>

      <main className="app-main">
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

        <section className="gallery-section">
          <h2>Publicaciones recientes</h2>
          {posts.length === 0 ? (
            <p className="empty-text">Aún no hay publicaciones. ¡Crea la primera!</p>
          ) : (
            <div className="masonry">
              {posts.map((post) => (
                <article key={post._id} className="masonry-item">
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
                      src={`http://localhost:4000${post.imageUrl}`}
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
