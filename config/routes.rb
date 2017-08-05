Rails.application.routes.draw do
  root 'welcome#index'

  get 'viewer', to: 'viewer#index'
end
