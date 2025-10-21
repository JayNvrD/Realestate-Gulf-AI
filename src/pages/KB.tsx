import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Property, PropertyFAQ } from '../types/db';
import { Plus, Edit, Trash2, Upload, Building2 } from 'lucide-react';

export default function KB() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [faqs, setFaqs] = useState<PropertyFAQ[]>([]);
  const [, setShowPropertyForm] = useState(false);
  const [, setShowFAQForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadFAQs(selectedProperty.id);
    }
  }, [selectedProperty]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('name');

      if (error) throw error;
      setProperties(data || []);
      if (data && data.length > 0 && !selectedProperty) {
        setSelectedProperty(data[0]);
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFAQs = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('property_faqs')
        .select('*')
        .eq('property_id', propertyId)
        .order('question');

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error loading FAQs:', error);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
      await loadProperties();
      setSelectedProperty(null);
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;

    try {
      const { error } = await supabase.from('property_faqs').delete().eq('id', id);
      if (error) throw error;
      if (selectedProperty) loadFAQs(selectedProperty.id);
    } catch (error) {
      console.error('Error deleting FAQ:', error);
    }
  };

  const propertyOptions = useMemo(
    () =>
      properties.map((property) => ({
        value: property.id,
        label: property.name,
      })),
    [properties],
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Loading knowledge base...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Content</p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-fluid-3xl">Knowledge Base</h1>
          <p className="text-sm text-slate-500">Manage properties and FAQs for the AI assistant.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700">
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowPropertyForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-600 hover:to-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Property
          </button>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Select Property</label>
        <select
          value={selectedProperty?.id || ''}
          onChange={(e) => {
            const property = properties.find((item) => item.id === e.target.value) || null;
            setSelectedProperty(property);
          }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="" disabled>
            Choose a property
          </option>
          {propertyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
        <aside className="hidden h-full space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
          <h3 className="text-lg font-semibold text-slate-900">Properties</h3>
          <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto pr-1">
            {properties.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No properties yet</p>
            ) : (
              properties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => setSelectedProperty(property)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    selectedProperty?.id === property.id
                      ? 'border-cyan-300 bg-gradient-to-br from-cyan-50 to-blue-50 shadow'
                      : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{property.name}</p>
                      <p className="text-xs text-slate-500">{property.location}</p>
                      <p className="text-xs font-semibold text-cyan-600">${property.base_price.toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="space-y-6">
          {selectedProperty ? (
            <>
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-slate-900">{selectedProperty.name}</h2>
                    <p className="text-sm text-slate-500">{selectedProperty.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProperty(selectedProperty.id)}
                      className="rounded-lg p-2 text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </header>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Base Price</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">${selectedProperty.base_price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Availability</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{selectedProperty.availability}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Unit Types</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedProperty.unit_types.map((type) => (
                        <span key={type} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {type}
                        </span>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Amenities</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity) => (
                        <span key={amenity} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Highlights</h4>
                    <p className="mt-2 text-sm text-slate-600">{selectedProperty.highlights}</p>
                  </section>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">Property FAQs</h3>
                  <button
                    onClick={() => setShowFAQForm(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add FAQ
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {faqs.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">No FAQs yet</p>
                  ) : (
                    faqs.map((faq) => (
                      <details
                        key={faq.id}
                        className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-200"
                      >
                        <summary className="flex cursor-pointer items-start justify-between gap-3 text-sm font-semibold text-slate-700">
                          <span>{faq.question}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              handleDeleteFAQ(faq.id);
                            }}
                            className="rounded-lg p-1 text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </summary>
                        <p className="mt-3 text-sm text-slate-600">{faq.answer}</p>
                      </details>
                    ))
                  )}
                </div>
              </article>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <Building2 className="mx-auto h-16 w-16 text-slate-300" />
              <p className="mt-4 text-sm text-slate-500">Select a property to view details.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
